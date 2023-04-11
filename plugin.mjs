import { readFile, writeFile } from 'node:fs/promises';
import { join, relative, posix } from 'node:path';
import importFrom from 'import-from';
import {convertPathToImport} from "./utils/resolve-module.mjs";
import {mapSourceToOutputFiles} from "./utils/map-inputs-outputs.mjs";

export default ({ package: packageOverride, globalConfig, projectConfig, tests }) => {
  return {
    name: 'jest',
    async setup(build) {
      const rootDir = globalConfig.rootDir;
      const outdir = build.initialOptions.outdir;
      const external = build.initialOptions.external || [];

      const { createScriptTransformer } = importFrom(rootDir, '@jest/transform');
      const transformer = await createScriptTransformer(projectConfig);

      build.onLoad({ filter: /.*/ }, async (args) => {
        const fileContent = await readFile(args.path, 'utf8');
        const loader = args.path.endsWith('.json') ? 'json' : 'js';
        const { code: contents } =  transformer.transformSource(args.path, fileContent, {});
        return { contents, loader };
      });

      build.onEnd(async (result) => {
        const mapping = mapSourceToOutputFiles({
          rootDir,
          outdir,
          sourceFiles: Object.keys(result.metafile.inputs),
          outputFiles: Object.keys(result.metafile.outputs),
        });

        function mapFile(file) {
          const out = mapping[file] || file;
          if (!out) {
            return;
          }

          return convertPathToImport(outdir, out);
        }

        const flattenedConfig = {
          maxWorkers: globalConfig.maxWorkers,

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

        await writeFile(join(outdir, 'package.json'), JSON.stringify({
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
          ...packageOverride,
        }, null, 2));
      });
    },
  };
};
