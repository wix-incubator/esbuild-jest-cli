import merge from 'lodash.merge';
import { build as esbuild } from 'esbuild';

import esbuildJest from './plugin.mjs';
import {isBuiltinReporter} from "./utils/is-builtin-reporter.mjs";
import {JEST_DEPENDENCIES} from "./utils/jest-dependencies.mjs";
import {logger, optimizedLogger, optimizeTracing} from "./utils/logger.mjs";
import {convertPathToImport} from "./utils/resolve-module.mjs";
import {importViaChain, importViaChainUnsafe} from "./utils/resolve-via-chain.mjs";

const __RESOLVED__ = optimizeTracing((id, resolved) => {
  optimizedLogger.trace({ id }, `resolved: ${resolved}`);
});

const __IS_EXTERNAL__ = optimizeTracing((id, external) => {
  optimizedLogger.trace(`mark as ${external ? 'external' : 'internal'}: ${id}`);
});

/** @param {import('esbuild-jest-cli').ESBuildJestConfig} esbuildJestConfig */
export async function build(esbuildJestConfig = {}) {
  const rootDir = process.cwd();

  const esbuildBaseConfig = { ...esbuildJestConfig.esbuild };
  const externalModules = [
    ...JEST_DEPENDENCIES,
    ...(esbuildBaseConfig.external || []),
  ];

  const isExternal = (id) =>
    optimizedLogger.trace.complete(`isExternal: ${id}`, () => {
      const importLikePath = convertPathToImport(rootDir, id);
      __RESOLVED__(id, importLikePath);
      const result = !importLikePath.startsWith('<rootDir>') && externalModules.some(id => {
        // TODO: This is not enough, we need to support wildcards and maybe some more syntax options
        return id === importLikePath || importLikePath.startsWith(`${id}/`);
      });
      __IS_EXTERNAL__(id, result);
      return result;
    });

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
  /**
   * @type {{
   *   configPath: string;
   *   globalConfig: import('@jest/types').GlobalConfig;
   *   projectConfig: import('@jest/types').ProjectConfig;
   * }}
   */
  const fullConfig = await readConfig(jestArgv, rootDir, false);
  const { configPath, globalConfig, projectConfig } = fullConfig;
  logger.trace({ configPath, globalConfig, projectConfig }, 'read Jest config');

  const { default: Runtime } = importViaChain(rootDir, ['jest', '@jest/core'], 'jest-runtime');
  const testContext = await Runtime.createContext(projectConfig, { maxWorkers: 1, watch: false, watchman: false });
  const { SearchSource } = importViaChain(rootDir, ['jest'], '@jest/core');
  const searchSource = new SearchSource(testContext);
  const { tests } = await searchSource.getTestPaths(globalConfig, []);

  const entryPoints = [
    ...globalConfig.reporters.map(r => Array.isArray(r) ? r[0] : r).filter(x => !isBuiltinReporter(x)),
    globalConfig.globalSetup,
    ...(projectConfig.setupFiles || []),
    projectConfig.testEnvironment,
    ...tests.map(test => test.path),
    ...(projectConfig.setupFilesAfterEnv || []),
    globalConfig.globalTeardown,
  ].filter(p => p && !isExternal(p));

  const esbuildConfig = {
    ...esbuildBaseConfig,

    bundle: true,
    splitting: true,
    metafile: true,
    external: externalModules,
    outbase: rootDir,
    format: 'esm',

    entryPoints,
    plugins: [
      esbuildJest({
        globalConfig,
        projectConfig,
        tests: tests.map(t => t.path),
        jestConfig: wrapPatcherMiddleware(esbuildJestConfig.jestConfig),
        package: wrapPatcherMiddleware(esbuildJestConfig.package),
        writeMetafile: esbuildJestConfig.metafile,
        useTransformer: esbuildJestConfig.useTransformer,
      }),
      ...(esbuildBaseConfig.plugins || []),
    ],
  };

  const buildResult = await logger.trace.complete(esbuildConfig, 'esbuild', () => esbuild(esbuildConfig));

  return buildResult;
}

function wrapPatcherMiddleware(config) {
  return typeof config === 'function' ? config : createPackageMerger(config)
}

function createPackageMerger(override) {
  return (pkg) => merge(pkg, override)
}
