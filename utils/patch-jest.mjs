#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { resolveModuleViaChain } from "./resolve-via-chain.mjs";

export default function patchJest(rootDir) {
    const manifestPath = resolveModuleViaChain(rootDir, ['jest'], 'jest-cli/package.json');
    if (!manifestPath) {
      return;
    }

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (!manifest.exports['./run']) {
        manifest.exports['./run'] = './build/run.js';
        const newManifestRaw = JSON.stringify(manifest, null, 2) + '\n';
        writeFileSync(manifestPath, newManifestRaw);
    }
}

patchJest(process.cwd());
