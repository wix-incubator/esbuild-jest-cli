const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..', 'simple-project-bundled');

main();

function main() {
  console.log('Verifying that the bundled project is correct...');
  verifyDirectoryStructure();
  verifyJestConfig();
  console.log('Success!');
}

function verifyDirectoryStructure() {
  assertExists('package.json');
  assertExists('jest.config.json');
  assertExists('globalSetup.js');
  assertExists('globalTeardown.js');
  assertExists('customReporter.js');
  assertExists('src/entry1.test.js');
  assertExists('src/entry2.test.js');
  assertExists('_.._/linked-dependencies/bundled/reporters/default.js');
  assertExists('bundled_modules/jest-environment-emit/node.js');
  assertExists('bundled_modules/lodash/noop.js');
  assertDoesNotExist('node_modules');
  assertDoesNotExist('_.._/linked-dependencies/external');
}

function verifyJestConfig() {
  const { coverageDirectory, globalSetup, reporters, setupFilesAfterEnv, testEnvironment, testMatch, testRunner, globalTeardown } = parseJSON('jest.config.json');

  assertEqual(coverageDirectory, '<rootDir>/coverage', 'coverageDirectory');
  assertEqual(globalSetup, '<rootDir>/globalSetup.js', 'globalSetup');
  assertEqual(reporters.length, 4, 'reporters length');
  assertEqual(reporters[0][0], 'default', 'reporters[0]');
  assertEqual(reporters[1][0], '<rootDir>/_.._/linked-dependencies/bundled/reporters/default.js', 'reporters[1]');
  assertEqual(reporters[2][0], '@linked-dependencies/external/reporter', 'reporters[2]');
  assertEqual(reporters[3][0], '<rootDir>/customReporter.js', 'reporters[3]');
  assertEqual(setupFilesAfterEnv.length, 1, 'setupFilesAfterEnv.length');
  assertEqual(setupFilesAfterEnv[0], '<rootDir>/bundled_modules/lodash/noop.js', 'setupFilesAfterEnv[0]');
  assertEqual(testEnvironment, '<rootDir>/bundled_modules/jest-environment-emit/node.js', 'testEnvironment');
  assertEqual(testMatch.length, 2, 'testMatch.length');
  assertEqual(testMatch[0], '<rootDir>/src/entry1.test.js', 'testMatch[0]');
  assertEqual(testMatch[1], '<rootDir>/src/entry2.test.js', 'testMatch[1]');
  assertEqual(testRunner, 'jest-circus/runner', 'testRunner');
  assertEqual(globalTeardown, '<rootDir>/globalTeardown.js', 'globalTeardown');
}

function assertExists(fileName) {
  assert(fs.existsSync(path.join(rootDir, fileName)), `${fileName} should exist`);
}

function assertDoesNotExist(fileName) {
  assert(!fs.existsSync(path.join(rootDir, fileName)), `${fileName} should not exist`);
}

function assertEqual(actual, expected, name) {
  assert(actual === expected, `${name} should be ${expected}, but was: ${actual}`);
}

function parseJSON(fileName) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, fileName), 'utf8'));
}
