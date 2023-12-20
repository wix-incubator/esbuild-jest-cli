import { readFile, writeFile } from 'node:fs/promises';
import { sep, join, relative, resolve } from 'node:path';
import importFrom from 'import-from';
import { logger, optimizeTracing } from "./utils/logger.mjs";
import { convertPathToImport } from "./utils/resolve-module.mjs";
import { isBuiltinReporter } from "./utils/is-builtin-reporter.mjs";
import { mapSourceToOutputFiles } from "./utils/map-inputs-outputs.mjs";
import { moveJsFile } from "./utils/move-js-file.mjs";
import { pruneDirectory } from "./utils/prune-directory.mjs";
import { JEST_DEPENDENCIES } from "./utils/jest-dependencies.mjs";

const passThrough = (filePath, fileContents) => fileContents;

const __CONTENT = optimizeTracing((log, content, message) => log.trace({ content }, message));
const __PROCESS = optimizeTracing((log, before, after, message) => {
  if (before !== after) {
    log.trace({content: after}, message);
  }
});

const __READ = (log, content) => __CONTENT(log, content, 'read file');
const __PREPROCESS = (log, before, after) => __PROCESS(log, before, after, 'pre-process file');
const __TRANSFORM = (log, content) => __CONTENT(log, content, 'transform file');
const __POSTPROCESS = (log, before, after) => __PROCESS(log, before, after, 'post-process file');
const __FILE_MAPPING = (log, content) => __CONTENT(log, content, 'create file mapping');
const __JEST_CONFIG = (log, content) => __CONTENT(log, content, 'create jest config');
const __PACKAGE_JSON = (log, content) => __CONTENT(log, content, 'create package.json');

export default ({
  package: packageMiddleware,
  globalConfig,
  projectConfig,
  tests,
  preTransform = passThrough,
  postTransform = passThrough,
}) => {
  return {
    name: 'jest',
    async setup(build) {
      const rootDir = resolve(globalConfig.rootDir);
      const outdir = resolve(build.initialOptions.outdir);
      const external = build.initialOptions.external || [];

      const { createScriptTransformer } = importFrom(rootDir, '@jest/transform');
      const transformer = await createScriptTransformer(projectConfig);

      build.onLoad({ filter: /.*/ }, async (args) => {
        const log = logger.child({ tid: ['jest-transform', args.path] });

        return log.trace.complete(relative(rootDir, args.path), async () => {
          const fileContent = await readFile(args.path, 'utf8');
          __READ(log, fileContent);

          const preprocessed = preTransform(args.path, fileContent);
          __PREPROCESS(log, fileContent, preprocessed);

          const { code: transformed } =  transformer.transformSource(args.path, preprocessed, {});
          __TRANSFORM(log, transformed);

          const contents = postTransform(args.path, transformed);
          __POSTPROCESS(log, transformed, contents);

          const loader = args.path.endsWith('.json') ? 'json' : 'js';
          return { contents, loader };
        });
      });

      build.onEnd(async (result) => {
        const mapping = mapSourceToOutputFiles({
          rootDir,
          outdir,
          sourceFiles: Object.keys(result.metafile.inputs),
          outputFiles: Object.keys(result.metafile.outputs),
        });

        __FILE_MAPPING(logger, mapping);

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
          const segments = modulePath.split(sep);
          const nodeModulesIndex = segments.indexOf('node_modules');
          if (nodeModulesIndex < 0) {
            return modulePath;
          }

          return [outdir, 'bundled_externals', ...segments.slice(nodeModulesIndex + 1)].join(sep);
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
          transform: {},
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
          type: 'module',
          private: true,
          scripts: {
            test: 'NODE_NO_WARNINGS=1 NODE_OPTIONS="--experimental-vm-modules" jest',
          },
          dependencies: {
            ...externalDependencies,
          },
        });

        __PACKAGE_JSON(logger, packageJson);
        await writeFile(join(outdir, 'package.json'), JSON.stringify(packageJson, null, 2));
      });
    },
  };
};
