#!/usr/bin/env node

import { cosmiconfig } from 'cosmiconfig';
import { build } from './index.mjs';

try {
  const explorer = cosmiconfig('esbuild-jest');
  const esbuildJestBaseConfig = await explorer.search();
  await build(esbuildJestBaseConfig.config);
} catch (e) {
  console.error(`${e.stack || e}`);
  process.exit(1);
}
