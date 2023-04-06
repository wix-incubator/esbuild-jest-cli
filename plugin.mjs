import { readFile, writeFile } from 'node:fs/promises';
import { join, relative, posix } from 'node:path';
import importFrom from 'import-from';
import resolveFrom from 'resolve-from';
import {convertPathToImport} from "./utils/resolve-module.mjs";

export default ({ projectConfig, rootDir }) => {
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
        const flattenedConfig = {
          ...projectConfig,
          cacheDirectory: undefined,
          cwd: undefined,
          globalSetup: mjsify(rootDir, projectConfig.globalSetup),
          globalTeardown: mjsify(rootDir, projectConfig.globalTeardown),
          id: undefined,
          moduleNameMapper: undefined,
          rootDir: undefined,
          roots: undefined,
          runner: undefined,
          testEnvironment: await convertPathToImport(rootDir, projectConfig.testEnvironment),
          testMatch: projectConfig.testMatch.map((testMatch) => mjsify(rootDir, testMatch)),
          testRunner: await convertPathToImport(rootDir, projectConfig.testRunner),
          transform: {},
        };

        await writeFile(join(outdir, 'jest.config.json'), JSON.stringify(flattenedConfig, null, 2));
      });
    },
  };
};

function mjsify(rootDir, filePath) {
  return posix.join('<rootDir>', relative(rootDir, filePath).replace(/\.[^.]+$/, '.mjs'));
}
