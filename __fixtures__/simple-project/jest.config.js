/** @type {import('jest').Config} */
module.exports = {
  globalSetup: '<rootDir>/globalSetup',
  globalTeardown: '<rootDir>/globalTeardown',
  setupFilesAfterEnv: ['lodash/noop'],
  reporters: [
    'default',
    'linked-local-reporter',
    '<rootDir>/customReporter.js',
  ],
  testMatch: [
    '<rootDir>/src/**/*.test.js',
  ],
  testEnvironment: 'jest-environment-emit/node',
};
