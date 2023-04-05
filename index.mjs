import "./patch-jest.mjs";
import { cosmiconfig } from 'cosmiconfig';
import { build as esbuild } from 'esbuild';
import importFrom from 'import-from';

import esbuildJest from './plugin.mjs';

const explorer = cosmiconfig('esbuild-jest');

export async function build() {
  const rootDir = process.cwd();

  const esbuildBaseConfig = await explorer.search(rootDir);

  const { buildArgv } = importFrom(rootDir, 'jest-cli/run');
  const jestArgv = await buildArgv();

  const { readConfig } = importFrom(rootDir, 'jest-config');
  const fullConfig = await readConfig(jestArgv, rootDir, false);
  const { configPath, globalConfig, projectConfig } = fullConfig;

  const { default: Runtime } = importFrom(rootDir, 'jest-runtime');
  const testContext = await Runtime.createContext(projectConfig, { maxWorkers: 1, watch: false, watchman: false });
  const { SearchSource } = importFrom(rootDir, '@jest/core');
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
    ...(esbuildBaseConfig && esbuildBaseConfig.config),
    entryPoints: entryPoints.filter(Boolean),
    plugins: [esbuildJest({
      argv: jestArgv,
      configPath,
      rootDir,
      projectConfig,
    })],
  });

  return buildResult;
}