#!/usr/bin/env node

import { cosmiconfig } from 'cosmiconfig';
import { logger } from './utils/logger.mjs';
import { build } from './index.mjs';

try {
  const explorer = cosmiconfig('esbuild-jest');
  const esbuildJestBaseConfig = await explorer.search();
  await logger.trace.complete(esbuildJestBaseConfig, 'esbuild-jest-cli', () => build(esbuildJestBaseConfig.config));
} catch (e) {
  console.error(`${e.stack || e}`);
  process.exit(1);
}
