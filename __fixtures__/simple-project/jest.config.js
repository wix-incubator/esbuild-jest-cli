/** @type {import('jest').Config} */
module.exports = {
  globalSetup: '<rootDir>/globalSetup',
  globalTeardown: '<rootDir>/globalTeardown',
  setupFilesAfterEnv: ['lodash/noop'],
  reporters: [
    'default',
    '<rootDir>/customReporter.js',
  ],
  testMatch: [
    '<rootDir>/src/**/*.test.js',
  ],
  testEnvironment: 'jest-environment-emit/node',
};
