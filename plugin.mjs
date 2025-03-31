import {writeFile} from 'node:fs/promises';
import {join, resolve, sep} from 'node:path';
import importFrom from 'import-from';
import {logger, optimizeTracing} from "./utils/logger.mjs";
import {convertPathToImport} from "./utils/resolve-module.mjs";
import {isBuiltinReporter} from "./utils/is-builtin-reporter.mjs";
import {mapSourceToOutputFiles, relativizeEntries} from "./utils/map-inputs-outputs.mjs";
import {moveJsFile} from "./utils/move-js-file.mjs";
import {pruneDirectory} from "./utils/prune-directory.mjs";
import {JEST_DEPENDENCIES} from "./utils/jest-dependencies.mjs";

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
  jestConfig: jestConfigMiddleware,
  package: packageMiddleware,
  globalConfig,
  projectConfig,
  tests,
  useTransformer = noop,
  writeMetafile = false,
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
        await moveExternalEntryPointsBackToRoot(mapping);
        await pruneDirectory(join(outdir, 'node_modules'));
        __FILE_MAPPING_CREATED(logger, mapping);
        const flattenedConfig = jestConfigMiddleware({
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
          testRunner: mapTestRunner(mapFile(projectConfig.testRunner)),
          transform: {
            '^(?!.*node_modules/).+\\.js$': '@swc/jest',
            '^.+\\.(jsx|tsx?)$': '@swc/jest',
          },
          transformIgnorePatterns: [],
        });
        __JEST_CONFIG(logger, flattenedConfig);
        await writeFile(join(outdir, 'jest.config.json'), JSON.stringify(flattenedConfig, null, 2));

        if (writeMetafile) {
          await writeFile(join(outdir, 'metafile.json'), JSON.stringify({
            ...result.metafile,
            mapping: relativizeEntries([rootDir, outdir], mapping),
          }) + '\n');
        }

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

        /** @param {string} testRunner */
        function mapTestRunner(testRunner) {
          if (testRunner) {
            const segments = testRunner.split(sep);
            const circusIndex = segments.indexOf('jest-circus');
            const jasmine2Index = segments.indexOf('jest-jasmine2');

            if (circusIndex > 0 && segments[circusIndex - 1] === 'node_modules') {
              return 'jest-circus/runner';
            }

            if (jasmine2Index > 0 && segments[jasmine2Index - 1] === 'node_modules') {
              return 'jest-jasmine2';
            }
          }

          return testRunner;
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
            test: "NODE_OPTIONS='-r @swc-node/register' jest"
          },
          dependencies: {
            "@swc/core": "^1.10.1",
            "@swc/jest": "^0.2.37",
            "@swc-node/register": "^1.10.9",

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
