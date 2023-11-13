import path from 'node:path';

import resolveFrom from "resolve-from";
import importFrom from "import-from";

export function resolveModuleViaChain(rootDir, chain, targetModuleName) {
  return resolveFrom.silent(resolveCwd(rootDir, chain), targetModuleName);
}

export function importViaChain(rootDir, chain, targetModuleName) {
  return importFrom(resolveCwd(rootDir, chain), targetModuleName);
}

export function importViaChainUnsafe(rootDir, chain, targetFilename) {
  return importFrom(rootDir, path.join(resolveCwd(rootDir, chain), targetFilename));
}

function resolveCwd(rootDir, chain) {
  let cwd = rootDir;
  for (const module of chain) {
    cwd = path.dirname(resolveFrom.silent(cwd, module + '/package.json'));
  }

  return cwd;
}
