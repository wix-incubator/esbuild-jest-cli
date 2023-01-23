const { readFile } = require('fs').promises;
const { readConfig } = require('jest-config');
const { default: Runtime } = require('jest-runtime');
const { SearchSource } = require('@jest/core');
const { createScriptTransformer } = require('@jest/transform');

main();

async function main() {
  const argv = {};
  const fullConfig = await readConfig(argv, '__fixtures__/simple-project', false);
  const { globalConfig, projectConfig } = fullConfig;
  const transformer = await createScriptTransformer(projectConfig);
  const transformFile = createTransformFile(transformer);
  const context = await Runtime.createContext(projectConfig, { maxWorkers: 1, watch: false, watchman: false });
  const source = new SearchSource(context);
  const { tests } = await source.getTestPaths(globalConfig, []);

  console.log('Global setup', projectConfig.globalSetup);
  console.dir(await transformFile(projectConfig.globalSetup));
  for (const test of tests) {
    console.log('Test file', test.path);
    console.dir(await transformFile(test.path));
  }
  console.log('Global teardown', projectConfig.globalTeardown);
  console.dir(await transformFile(projectConfig.globalTeardown));
}

function createTransformFile(transformer) {
  return async (filename, options) => {
    return transformer.transformSource(filename, await readFile(filename, 'utf8'), options);
  };
}
