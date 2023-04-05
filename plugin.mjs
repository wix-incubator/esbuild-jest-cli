import { readFile, writeFile } from 'node:fs/promises';
import { join, relative, posix } from 'node:path';
import importFrom from 'import-from';

export default (options = {}) => {
  const { argv = {}, rootDir = process.cwd() } = options;
  let { configPath, projectConfig } = options;

  return {
    name: 'jest',
    async setup(build) {
      const outdir = build.initialOptions.outdir;

      if (!projectConfig) {
        const { readConfig } = importFrom(rootDir, 'jest-config');
        const fullConfig = await readConfig(argv, rootDir, false);
        configPath = fullConfig.configPath;
        projectConfig = fullConfig.projectConfig;
      }

      const { createScriptTransformer } = importFrom(rootDir, '@jest/transform');
      const transformer = await createScriptTransformer(projectConfig);

      build.onLoad({ filter: /.*/ }, async (args) => {
        const fileContent = await readFile(args.path, 'utf8');
        const { code } =  transformer.transformSource(args.path, fileContent, {});
        return { contents: code, loader: 'js' };
      });

      build.onEnd(async (result) => {
        await writeFile(join(outdir, 'jest.config.json'), JSON.stringify({
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
          testEnvironment: undefined, // TODO: implement properly
          testMatch: projectConfig.testMatch.map((testMatch) => mjsify(rootDir, testMatch)),
          testRunner: undefined, // TODO: implement properly
          transform: {},
        }, null, 2));
      });
    },
  };
};

function mjsify(rootDir, filePath) {
  return posix.join('<rootDir>', relative(rootDir, filePath).replace(/\.[^.]+$/, '.mjs'));
}
