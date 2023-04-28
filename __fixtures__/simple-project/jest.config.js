/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  globalSetup: '<rootDir>/globalSetup',
  globalTeardown: '<rootDir>/globalTeardown',
  setupFilesAfterEnv: ['lodash/noop'],
  testMatch: [
    '<rootDir>/src/**/*.test.js',
  ]
};
