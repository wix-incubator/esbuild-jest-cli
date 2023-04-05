import { build } from './index.mjs';

try {
  await build();
} catch (e) {
  console.error(`${e}`);
  process.exit(1);
}