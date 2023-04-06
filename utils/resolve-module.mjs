import fs from 'node:fs';
import path from 'node:path';

import resolveFrom from "resolve-from";

export async function convertPathToImport(rootDir, absolutePath) {
  return resolveFromMain(rootDir, absolutePath)
    || resolveFromEntries(rootDir, absolutePath)
    || resolveFromRootDirectory(rootDir, absolutePath);
}

function resolveFromMain(rootDir, absolutePath) {
  const { packageName } = inferPackageInfo(rootDir, absolutePath);
  if (!packageName) {
    return undefined;
  }

  if (resolveFrom.silent(rootDir, packageName) === absolutePath) {
    return packageName;
  }

  return undefined;
}

function resolveFromEntries(rootDir, absolutePath) {
  const { packageName, packagePath } = inferPackageInfo(rootDir, absolutePath);
  if (!packageName) {
    return undefined;
  }

  const packageJson = readPackageJson(packagePath);
  if (!packageJson) {
    return undefined;
  }

  const packageExports = packageJson.exports || {};
  for (const innerEntry of Object.keys(packageExports)) {
    const packageEntry = path.posix.join(packageName, innerEntry)
    const resolvedPath = resolveFrom.silent(rootDir, packageEntry);
    if (resolvedPath === absolutePath) {
      return packageEntry;
    }
  }

  return path.posix.join(packageName, ...path.relative(packagePath, absolutePath).split(path.sep));
}

function resolveFromRootDirectory(rootDir, absolutePath) {
  const segments = path.relative(rootDir, absolutePath).split(path.sep);
  return path.posix.join('<rootDir>', ...segments);
}

function inferPackageInfo(rootDir, absolutePath) {
  const result = { packageName: undefined, packagePath: undefined };
  const relativePath = path.relative(rootDir, absolutePath);
  const pathParts = relativePath.split(path.sep);
  const nodeModulesIndex = pathParts.indexOf('node_modules');
  if (nodeModulesIndex < 0) {
    return result;
  }

  const isInnerModule = pathParts.lastIndexOf('node_modules') > nodeModulesIndex;
  if (isInnerModule) {
    return result;
  }

  const maybePackageName = pathParts[nodeModulesIndex + 1];
  if (maybePackageName.startsWith('@')) {
    const scope = maybePackageName;
    const packageName = pathParts[nodeModulesIndex + 2];
    result.packageName = `${scope}/${packageName}`;
    result.packagePath = path.join(rootDir, ...pathParts.slice(0, nodeModulesIndex + 3));
  } else {
    result.packageName = maybePackageName;
    result.packagePath = path.join(rootDir, ...pathParts.slice(0, nodeModulesIndex + 2));
  }

  return result;
}

function readPackageJson(packagePath) {
  const packageJsonPath = path.join(packagePath, 'package.json');

  try {
    return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  } catch {
    return null;
  }
}
