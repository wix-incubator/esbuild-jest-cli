import { cosmiconfig } from 'cosmiconfig';
import { build as esbuild } from 'esbuild';

import esbuildJest from './plugin.mjs';
import {importViaChain} from "./utils/resolve-via-chain.mjs";

const explorer = cosmiconfig('esbuild-jest');

export async function build() {
  const rootDir = process.cwd();

  const esbuildBaseConfig = await explorer.search(rootDir);

  const { buildArgv } = importViaChain(rootDir, ['jest'], 'jest-cli/run');
  const jestArgv = await buildArgv();

  const { readConfig } = importViaChain(rootDir, ['jest'], 'jest-config');
  const fullConfig = await readConfig(jestArgv, rootDir, false);
  const { configPath, globalConfig, projectConfig } = fullConfig;

  const { default: Runtime } = importViaChain(rootDir, ['jest', '@jest/core'], 'jest-runtime');
  const testContext = await Runtime.createContext(projectConfig, { maxWorkers: 1, watch: false, watchman: false });
  const { SearchSource } = importViaChain(rootDir, ['jest'], '@jest/core');
  const searchSource = new SearchSource(testContext);
  const { tests } = await searchSource.getTestPaths(globalConfig, []);

  const entryPoints = [
    globalConfig.globalSetup,
    ...(projectConfig.setupFiles || []),
    ...tests.map(test => test.path),
    ...(projectConfig.setupFilesAfterEnv || []),
    globalConfig.globalTeardown,
  ];

  const buildResult = await esbuild({
    ...(esbuildBaseConfig && esbuildBaseConfig.config.esbuild),
    entryPoints: entryPoints.filter(Boolean),
    plugins: [esbuildJest({
      rootDir,
      projectConfig,
      tests: tests.map(t => t.path),
      package: esbuildBaseConfig && esbuildBaseConfig.config.package,
    })],
  });

  return buildResult;
}
