import { build } from 'esbuild';
import esbuildJest from './plugin.js';

build({
    bundle: true,
    splitting: true,
    metafile: true,
    format: 'esm',
    entryPoints: [
        '__fixtures__/simple-project/globalSetup.js',
        '__fixtures__/simple-project/globalTeardown.js',
        '__fixtures__/simple-project/src/entry1.test.js',
        '__fixtures__/simple-project/src/entry2.test.js',
    ],
    outdir: '__fixtures__/simple-project/dist',
    plugins: [esbuildJest({
        rootDir: '__fixtures__/simple-project',
    })],
}).then((r) => {
    console.log(r);
}, e => {
    console.error(`${e}`);
    process.exit(1);
});
