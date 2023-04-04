/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  globalSetup: '<rootDir>/globalSetup',
  globalTeardown: '<rootDir>/globalTeardown',
  testMatch: [
    '<rootDir>/src/**/*.test.js',
  ]
};
