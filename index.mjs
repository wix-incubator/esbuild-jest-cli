import { readFile } from 'fs/promises';
import importFrom from 'import-from';

export default (options = {}) => {
  const { argv = {}, rootDir = process.cwd() } = options;
  let { projectConfig } = options;

  return {
    name: 'jest',
    async setup(build) {
      if (!projectConfig) {
        const { readConfig } = importFrom(rootDir, 'jest-config');
        const fullConfig = await readConfig(argv, rootDir, false);
        projectConfig = fullConfig.projectConfig;
      }

      const { createScriptTransformer } = importFrom(rootDir, '@jest/transform');
      const transformer = await createScriptTransformer(projectConfig);

      build.onLoad({ filter: /.*/ }, async (args) => {
        const fileContent = await readFile(args.path, 'utf8');
        const { code, originalCode, sourceMapPath } =  transformer.transformSource(args.path, fileContent/*, options*/);
        return { contents: code, loader: 'js' };
      });
    },
  };
};
