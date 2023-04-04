import { readFile } from 'fs/promises';
import { readConfig } from 'jest-config';
import { createScriptTransformer } from '@jest/transform';

export default (options = {}) => {
  return {
    name: 'jest',
    async setup(build) {
      const argv = options.argv || {};
      let projectConfig = options.projectConfig;
      if (!projectConfig) {
        const rootDir = options.rootDir || process.cwd();
        const fullConfig = await readConfig(argv, rootDir, false);
        projectConfig = fullConfig.projectConfig;
      }

      const transformer = await createScriptTransformer(projectConfig);

      build.onLoad({ filter: /.*/ }, async (args) => {
        const fileContent = await readFile(args.path, 'utf8');
        const { code, originalCode, sourceMapPath } =  transformer.transformSource(args.path, fileContent/*, options*/);
        return { contents: code, loader: 'js' };
      });
    },
  };
};