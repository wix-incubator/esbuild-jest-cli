import { readFile, writeFile } from 'node:fs/promises';
import { sep, join, resolve } from 'node:path';
import importFrom from 'import-from';
import {moveFile} from "./utils/move-file.mjs";
import {convertPathToImport} from "./utils/resolve-module.mjs";
import {mapSourceToOutputFiles} from "./utils/map-inputs-outputs.mjs";

const passThrough = (filePath, fileContents) => fileContents;

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
        const fileContent = await readFile(args.path, 'utf8');
        const loader = args.path.endsWith('.json') ? 'json' : 'js';
        const preprocessed = preTransform(args.path, fileContent);
        const { code: transformed } =  transformer.transformSource(args.path, preprocessed, {});
        return { contents: postTransform(args.path, transformed), loader };
      });

      build.onEnd(async (result) => {
        const mapping = mapSourceToOutputFiles({
          rootDir,
          outdir,
          sourceFiles: Object.keys(result.metafile.inputs),
          outputFiles: Object.keys(result.metafile.outputs),
        });

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

        async function moveExternalEntryPointsBackToRoot() {
          for (const [input, output] of Object.entries(mapping)) {
            const newPath = redirectExternalModule(output);

            if (newPath !== output) {
              await moveFile(output, newPath);
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

        const flattenedConfig = {
          maxWorkers: globalConfig.maxWorkers,
          testTimeout: globalConfig.testTimeout,

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

        await writeFile(join(outdir, 'jest.config.json'), JSON.stringify(flattenedConfig, null, 2));
      });

      build.onEnd(async (result) => {
        const externalDependencies = Object.fromEntries(['jest', ...external].map(dep => {
          const packageJson = importFrom.silent(rootDir, dep + '/package.json');
          return packageJson ? [dep, packageJson.version] : null;
        }).filter(Boolean));

        await writeFile(join(outdir, 'package.json'), JSON.stringify(packageMiddleware({
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
        }), null, 2));
      });
    },
  };
};
