import merge from 'lodash.merge';
import { build as esbuild } from 'esbuild';

import esbuildJest from './plugin.mjs';
import {ESM_REQUIRE_SHIM} from "./utils/esmRequireShim.mjs";
import {convertPathToImport} from "./utils/resolve-module.mjs";
import {importViaChain,importViaChainUnsafe} from "./utils/resolve-via-chain.mjs";
import {JEST_DEPENDENCIES} from "./utils/jestDependencies.mjs";

export async function build(esbuildJestConfig = {}) {
  const rootDir = process.cwd();

  const esbuildBaseConfig = { ...esbuildJestConfig.esbuild };
  const externalModules = [
    ...JEST_DEPENDENCIES,
    ...(esbuildBaseConfig.external || []),
  ];

  const isExternal = (id) => {
    const importLikePath = convertPathToImport(rootDir, id);
    return !importLikePath.startsWith('<rootDir>') && externalModules.some(id => {
      // TODO: This is not enough, we need to support wildcards and maybe some more syntax options
      return id === importLikePath || importLikePath.startsWith(`${id}/`);
    });
  }

  let buildArgv;

  try {
    ({buildArgv} = importViaChainUnsafe(rootDir, ['jest', 'jest-cli'], './build/run.js'));
  } catch (error) {
    try {
      ({buildArgv} = importViaChainUnsafe(rootDir, ['jest', 'jest-cli'], './build/cli/index.js'));
    } catch {
      throw error;
    }
  }

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
    projectConfig.testEnvironment,
    ...tests.map(test => test.path),
    ...(projectConfig.setupFilesAfterEnv || []),
    globalConfig.globalTeardown,
  ].filter(p => p && !isExternal(p));

  const buildResult = await esbuild({
    ...esbuildBaseConfig,

    bundle: true,
    splitting: true,
    metafile: true,
    outbase: rootDir,
    banner: {
      js: ESM_REQUIRE_SHIM,
    },

    format: 'esm',

    entryPoints,
    plugins: [
      esbuildJest({
        globalConfig,
        projectConfig,
        tests: tests.map(t => t.path),
        package: wrapPackageMiddleware(esbuildJestConfig.package),
        preTransform: esbuildJestConfig.preTransform,
        postTransform: esbuildJestConfig.postTransform,
        ...(esbuildBaseConfig.external || []),
      }),
      ...(esbuildBaseConfig.plugins || []),
    ],
  });

  return buildResult;
}

function wrapPackageMiddleware(config) {
  return typeof config === 'function' ? config : createPackageMerger(config)
}

function createPackageMerger(override) {
  return (pkg) => merge(pkg, override)
}
