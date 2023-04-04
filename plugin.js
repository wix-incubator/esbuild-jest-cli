const { readFile } = require('fs').promises;
const { readConfig } = require('jest-config');
const { createScriptTransformer } = require('@jest/transform');

const esbuildJest = (options = {}) => {
    return {
        name: 'jest',
        async setup(build) {
            const argv = options.argv || {};
            const rootDir = options.rootDir || process.cwd();
            const fullConfig = await readConfig(argv, rootDir, false);
            const { projectConfig } = fullConfig;
            const transformer = await createScriptTransformer(projectConfig);

            build.onLoad({ filter: /.*/ }, async (args) => {
                const fileContent = await readFile(args.path, 'utf8');
                const { code, originalCode, sourceMapPath } =  transformer.transformSource(args.path, fileContent/*, options*/);
                return { contents: code, loader: 'js' };
            });
        },
    };
};

module.exports = esbuildJest;
