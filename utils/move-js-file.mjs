import { access, mkdir, rename } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function moveJsFile(source, destination) {
  const targetDir = dirname(destination);
  await mkdir(targetDir, { recursive: true });
  await rename(source, destination);

  if (await hasSourceMap(source)) {
    await rename(`${source}.map`, `${destination}.map`);
  }
}

async function hasSourceMap(file) {
  try {
    await access(`${file}.map`);
    return true;
  } catch (e) {
    if (e.code === 'ENOENT') {
      return false;
    }

    throw e;
  }
}
