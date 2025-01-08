import {
  bunyamin,
  nobunyamin,
  isDebug,
  threadGroups,
} from 'bunyamin';

const PACKAGE_NAME = 'esbuild-jest-cli';

threadGroups.add({
  id: PACKAGE_NAME,
  displayName: PACKAGE_NAME,
});

threadGroups.add({
  id: 'jest-transform',
  displayName: 'Jest Transform',
  maxConcurrency: 100500,
});

export const logger = bunyamin.child({ tid: PACKAGE_NAME });
export const optimizedLogger = isDebug(PACKAGE_NAME)
  ? logger
  : nobunyamin;

const noop = () => {};

export const optimizeTracing = isDebug(PACKAGE_NAME)
  ? ((f) => f)
  : (() => noop);
