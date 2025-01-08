/** @type {import('jest').Config} */
module.exports = {
  globalSetup: '<rootDir>/globalSetup',
  globalTeardown: '<rootDir>/globalTeardown',
  setupFilesAfterEnv: ['lodash/noop'],
  reporters: [
    'default',
    '@linked-dependencies/bundled/reporter',
    '@linked-dependencies/external/reporter',
    '<rootDir>/customReporter.js',
  ],
  testMatch: [
    '<rootDir>/src/**/*.test.js',
    '<rootDir>/src/**/*.test.cjs',
  ],
  testEnvironment: 'jest-environment-emit/node',
};
