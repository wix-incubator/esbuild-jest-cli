import { writeFileSync } from 'node:fs';
import resolveFrom from 'resolve-from';
import importFrom from "import-from";

export default function patchJest(rootDir) {
    const manifestPath = resolveFrom(rootDir, 'jest-cli/package.json');
    const manifest = importFrom(rootDir, 'jest-cli/package.json');
    if (!manifest.exports['./run']) {
        manifest.exports['./run'] = './build/run.js';
        const newManifestRaw = JSON.stringify(manifest, null, 2) + '\n';
        writeFileSync(manifestPath, newManifestRaw);
    }
}