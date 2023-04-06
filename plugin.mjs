import { readFile, writeFile } from 'node:fs/promises';
import { join, relative, posix } from 'node:path';
import importFrom from 'import-from';
import {convertPathToImport} from "./utils/resolve-module.mjs";
import {mapSourceToOutputFiles} from "./utils/map-inputs-outputs.mjs";

export default ({ package: packageOverride, projectConfig, rootDir, tests }) => {
  return {
    name: 'jest',
    async setup(build) {
      const outdir = build.initialOptions.outdir;

      const { createScriptTransformer } = importFrom(rootDir, '@jest/transform');
      const transformer = await createScriptTransformer(projectConfig);

      build.onLoad({ filter: /.*/ }, async (args) => {
        const fileContent = await readFile(args.path, 'utf8');
        const { code } =  transformer.transformSource(args.path, fileContent, {});
        return { contents: code, loader: 'js' };
      });

      build.onEnd(async (result) => {
        const mapping = mapSourceToOutputFiles({
          rootDir,
          outdir,
          sourceFiles: Object.keys(result.metafile.inputs),
          outputFiles: Object.keys(result.metafile.outputs),
        });

        async function mapFile(file) {
          const out = mapping[file] || file;
          if (!out) {
            return;
          }

          return await convertPathToImport(outdir, out);
        }

        const flattenedConfig = {
          ...projectConfig,
          cacheDirectory: undefined,
          cwd: undefined,
          globalSetup: await mapFile(projectConfig.globalSetup),
          globalTeardown: await mapFile(projectConfig.globalTeardown),
          id: undefined,
          moduleNameMapper: undefined,
          rootDir: undefined,
          roots: undefined,
          runner: undefined,
          testEnvironment: await mapFile(projectConfig.testEnvironment),
          testMatch: await Promise.all(tests.map(mapFile)),
          testRunner: await mapFile(projectConfig.testRunner),
          transform: {},
        };

        await writeFile(join(outdir, 'jest.config.json'), JSON.stringify(flattenedConfig, null, 2));
      });

      build.onEnd(async (result) => {
        await writeFile(join(outdir, 'package.json'), JSON.stringify({
          name: 'bundled-tests',
          version: '0.0.0',
          type: 'module',
          private: true,
          scripts: {
            test: 'NODE_NO_WARNINGS=1 NODE_OPTIONS="--experimental-vm-modules" jest',
          },
          dependencies: {
            'jest': importFrom(rootDir, 'jest/package.json').version,
          },
          ...packageOverride,
        }, null, 2));
      });
    },
  };
};
