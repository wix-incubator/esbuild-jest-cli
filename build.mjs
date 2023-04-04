import path from 'path';

import { SearchSource } from '@jest/core';
import { build } from 'esbuild';
import { readConfig } from 'jest-config';
import RuntimeCJS from 'jest-runtime';

import esbuildJest from './index.mjs';

/** @type {import('jest-runtime')} */
const Runtime = RuntimeCJS.default || RuntimeCJS;

async function main(argv = {}) {
    const {
        rootDir = process.cwd(),
        outputDirectory = path.join(rootDir, 'dist'),
    } = argv;

    const jestArgv = {}; // TODO: think about supporting jest arg overrides

    const fullConfig = await readConfig(jestArgv, rootDir, false);
    const { globalConfig, projectConfig } = fullConfig;
    const testContext = await Runtime.createContext(projectConfig, { maxWorkers: 1, watch: false, watchman: false });
    const searchSource = new SearchSource(testContext);
    const { tests } = await searchSource.getTestPaths(globalConfig, []);

    const entryPoints = [
        globalConfig.globalSetup,
        ...(projectConfig.setupFiles || []),
        ...tests.map(test => test.path),
        ...(projectConfig.setupFilesAfterEnv || []),
        globalConfig.globalTeardown,
    ];

    console.log(entryPoints);

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
}

try {
    await main({
        rootDir: '__fixtures__/simple-project',
    });
} catch (e) {
    console.error(`${e}`);
    process.exit(1);
}