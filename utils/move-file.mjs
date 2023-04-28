import { access, mkdir, rename } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function moveFile(source, destination) {
  try {
    const targetDir = dirname(destination);
    try {
      await access(targetDir);
    } catch {
      await mkdir(targetDir, { recursive: true });
    }

    await rename(source, destination);
  } catch (error) {
    throw error;
  }
}
