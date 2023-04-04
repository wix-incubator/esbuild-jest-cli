import path from 'path';

import { build } from 'esbuild';
import importFrom from 'import-from';

import esbuildJest from './index.mjs';
import patchJest from "./patch-jest.mjs";

async function main(argv) {
  const {
    rootDir = process.cwd(),
    outputDirectory = path.join(rootDir, '.esbuild-jest'),
  } = argv;

  patchJest(rootDir);

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

  const buildResult = await build({
    bundle: true,
    splitting: true,
    sourcemap: true,
    metafile: true,
    format: 'esm',
    outExtension: {
      '.js': '.mjs',
    },
    entryPoints: entryPoints.filter(Boolean),
    outdir: outputDirectory,
    plugins: [esbuildJest({
      argv: jestArgv,
      configPath,
      rootDir,
      projectConfig,
    })],
  });

  // console.log(buildResult);
}

try {
  await main({
    rootDir: process.env.ESBUILD_JEST_ROOT || '__fixtures__/simple-project',
    outputDirectory: process.env.ESBUILD_JEST_OUT || '.esbuild-jest',
  });
} catch (e) {
  console.error(`${e}`);
  process.exit(1);
}