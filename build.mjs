import path from 'path';

import { build } from 'esbuild';
import importFrom from 'import-from';

import esbuildJest from './index.mjs';

async function main(argv = {}) {
    const {
        rootDir = process.cwd(),
        outputDirectory = path.join(rootDir, 'dist'),
    } = argv;

    const jestArgv = {}; // TODO: think about supporting jest arg overrides

    const { readConfig } = importFrom(rootDir, 'jest-config');
    const fullConfig = await readConfig(jestArgv, rootDir, false);
    const { globalConfig, projectConfig } = fullConfig;
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
        metafile: true,
        format: 'esm',
        entryPoints: entryPoints.filter(Boolean),
        outdir: outputDirectory,
        plugins: [esbuildJest({
            projectConfig,
        })],
    });

    console.log(buildResult);
}

try {
    await main({
        rootDir: '__fixtures__/simple-project',
    });
} catch (e) {
    console.error(`${e}`);
    process.exit(1);
}