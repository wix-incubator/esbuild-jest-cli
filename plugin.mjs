import { writeFile } from 'node:fs/promises';
import { sep, join, relative, resolve } from 'node:path';
import importFrom from 'import-from';
import { logger, optimizeTracing } from "./utils/logger.mjs";
import { convertPathToImport } from "./utils/resolve-module.mjs";
import { isBuiltinReporter } from "./utils/is-builtin-reporter.mjs";
import { mapSourceToOutputFiles } from "./utils/map-inputs-outputs.mjs";
import { moveJsFile } from "./utils/move-js-file.mjs";
import { pruneDirectory } from "./utils/prune-directory.mjs";
import { JEST_DEPENDENCIES } from "./utils/jest-dependencies.mjs";

const noop = () => {};

const __CONTENT = optimizeTracing((log, content, message) => log.trace(
  typeof content === 'object'
    ? content
    : { content },
  message
));

const __FILE_MAPPING_CREATING = (log, input) => __CONTENT(log, input, 'creating file mapping');
const __FILE_MAPPING_CREATED = (log, input) => __CONTENT(log, input, 'created file mapping');
const __JEST_CONFIG = (log, config) => __CONTENT(log, config, 'create jest config');
const __PACKAGE_JSON = (log, packageJson) => __CONTENT(log, packageJson, 'create package.json');

export default ({
  package: packageMiddleware,
  globalConfig,
  projectConfig,
  tests,
  useTransformer = noop,
}) => {
  return {
    name: 'jest',
    async setup(build) {
      const rootDir = resolve(globalConfig.rootDir);
      const outdir = resolve(build.initialOptions.outdir);
      const external = build.initialOptions.external || [];

      const { createScriptTransformer } = importFrom(rootDir, '@jest/transform');
      const transformer = await createScriptTransformer(projectConfig);

      await useTransformer({
        build,
        transformer,
      });

      build.onEnd(async (result) => {
        const mappingInput = {
          rootDir,
          outdir,
          sourceFiles: Object.keys(result.metafile.inputs),
          outputFiles: Object.keys(result.metafile.outputs),
        };

        __FILE_MAPPING_CREATING(logger, mappingInput);
        const mapping = mapSourceToOutputFiles(mappingInput);
        __FILE_MAPPING_CREATED(logger, mapping);

        /**
         * @param {string} file
         * @returns {string}
         */
        function mapFile(file) {
          if (!file) {
            return;
          }

          const out = mapping[file];
          if (out) {
            return convertPathToImport(outdir, out);
          } else {
            return convertPathToImport(rootDir, file);
          }
        }

        /**
         * @param {string} reporter
         * @returns {string}
         */
        function mapSingleReporter(reporter) {
          return isBuiltinReporter(reporter) ? reporter : mapFile(reporter);
        }

        /** @param {string | [string, any]} reporter */
        function mapReporter(reporter) {
          return Array.isArray(reporter)
            ? [mapSingleReporter(reporter[0]), reporter[1]]
            : mapSingleReporter(reporter);
        }

        async function moveExternalEntryPointsBackToRoot() {
          for (const [input, output] of Object.entries(mapping)) {
            const newPath = redirectExternalModule(output);

            if (newPath !== output) {
              await moveJsFile(output, newPath);

              mapping[input] = newPath;
            }
          }
        }

        function redirectExternalModule(modulePath) {
          let replacements = 0;
          const segments = modulePath.split(sep);
          return segments.map(x => x === 'node_modules' && replacements++ === 0 ? 'bundled_modules' : x).join(sep);
        }

        await moveExternalEntryPointsBackToRoot();
        await pruneDirectory(join(outdir, 'node_modules'));

        const flattenedConfig = {
          maxWorkers: globalConfig.maxWorkers,
          testTimeout: globalConfig.testTimeout,
          reporters: globalConfig.reporters.map(mapReporter),

          ...projectConfig,
          cacheDirectory: undefined,
          cwd: undefined,
          coverageDirectory: mapFile(projectConfig.coverageDirectory),
          globalSetup: mapFile(projectConfig.globalSetup),
          globalTeardown: mapFile(projectConfig.globalTeardown),
          id: undefined,
          moduleNameMapper: undefined,
          rootDir: undefined,
          roots: undefined,
          runner: undefined,
          setupFiles: projectConfig.setupFiles.map(mapFile),
          setupFilesAfterEnv: projectConfig.setupFilesAfterEnv.map(mapFile),
          testEnvironment: mapFile(projectConfig.testEnvironment),
          testMatch: tests.map(mapFile),
          testRunner: mapFile(projectConfig.testRunner),
          transform: undefined,
          transformIgnorePatterns: undefined,
        };

        __JEST_CONFIG(logger, flattenedConfig);
        await writeFile(join(outdir, 'jest.config.json'), JSON.stringify(flattenedConfig, null, 2));
      });

      build.onEnd(async (result) => {
        const externalDependencies = Object.fromEntries(
          ['jest', ...external]
            .map(dep => {
              if (JEST_DEPENDENCIES.includes(dep)) {
                return null;
              }

              const packageJson = importFrom.silent(rootDir, dep + '/package.json');
              return packageJson ? [dep, packageJson.version] : null;
            }).filter(Boolean));

        const packageJson = packageMiddleware({
          name: 'bundled-tests',
          version: '0.0.0',
          private: true,
          scripts: {
            test: "NODE_OPTIONS='-r @babel/register' jest"
          },
          dependencies: {
            "@babel/core": "^7.24.6",
            "@babel/plugin-transform-modules-commonjs": "^7.24.6",
            "@babel/register": "^7.24.6",

            ...externalDependencies,
          },
        });

        __PACKAGE_JSON(logger, packageJson);
        await writeFile(join(outdir, 'package.json'), JSON.stringify(packageJson, null, 2));
        await writeFile(join(outdir, '.babelrc'), JSON.stringify({
          "compact": false,
          "plugins": ["@babel/plugin-transform-modules-commonjs"]
        }, null, 2));
      });
    },
  };
};
