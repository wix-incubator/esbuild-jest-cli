/** @type {import('jest').Config} */
module.exports = {
  globalSetup: '<rootDir>/globalSetup',
  globalTeardown: '<rootDir>/globalTeardown',
  setupFilesAfterEnv: ['lodash/noop'],
  reporters: [
    'default',
    'jest-allure2-reporter',
    '<rootDir>/customReporter.js',
  ],
  testMatch: [
    '<rootDir>/src/**/*.test.js',
  ],
  testEnvironment: 'jest-allure2-reporter/environment-node',
};
