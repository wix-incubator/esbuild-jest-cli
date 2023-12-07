import {lstat, readdir, rm} from "node:fs/promises";
import {join} from "node:path";

/** Removes empty directories recursively */
export async function pruneDirectory(pathToDir) {
  if (!await directoryExists(pathToDir)) {
    return;
  }

  for (const file of await readdir(pathToDir)) {
    const innerFilePath = join(pathToDir, file);
    const stat = await lstat(innerFilePath);
    if (stat.isDirectory()) {
      await pruneDirectory(innerFilePath);
    }
  }

  const files = await readdir(pathToDir);
  if (files.length === 0) {
    await rm(pathToDir, { recursive: true });
  }
}

function directoryExists(dir) {
  return lstat(dir)
    .then(stat => stat.isDirectory())
    .catch(e => e.code === 'ENOENT' ? Promise.resolve(false) : Promise.reject(e));
}
