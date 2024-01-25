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
  assertExists('globalSetup.mjs');
  assertExists('globalTeardown.mjs');
  assertExists('customReporter.mjs');
  assertExists('src/entry1.test.mjs');
  assertExists('src/entry2.test.mjs');
  assertExists('_.._/linked-dependencies/bundled/reporters/default.mjs');
  assertExists('bundled_externals/jest-environment-emit/node.mjs');
  assertExists('bundled_externals/lodash/noop.mjs');
  assertDoesNotExist('node_modules');
  assertDoesNotExist('_.._/linked-dependencies/external');
}

function verifyJestConfig() {
  const { globalSetup, reporters, setupFilesAfterEnv, testEnvironment, testMatch, testRunner, globalTeardown } = parseJSON('jest.config.json');

  assertEqual(globalSetup, '<rootDir>/globalSetup.mjs', 'globalSetup');
  assertEqual(reporters.length, 4, 'reporters length');
  assertEqual(reporters[0][0], 'default', 'reporters[0]');
  assertEqual(reporters[1][0], '<rootDir>/_.._/linked-dependencies/bundled/reporters/default.mjs', 'reporters[1]');
  assertEqual(reporters[2][0], '@linked-dependencies/external/reporter', 'reporters[2]');
  assertEqual(reporters[3][0], '<rootDir>/customReporter.mjs', 'reporters[3]');
  assertEqual(setupFilesAfterEnv.length, 1, 'setupFilesAfterEnv.length');
  assertEqual(setupFilesAfterEnv[0], '<rootDir>/bundled_externals/lodash/noop.mjs', 'setupFilesAfterEnv[0]');
  assertEqual(testEnvironment, '<rootDir>/bundled_externals/jest-environment-emit/node.mjs', 'testEnvironment');
  assertEqual(testMatch.length, 2, 'testMatch.length');
  assertEqual(testMatch[0], '<rootDir>/src/entry1.test.mjs', 'testMatch[0]');
  assertEqual(testMatch[1], '<rootDir>/src/entry2.test.mjs', 'testMatch[1]');
  assertEqual(testRunner, 'jest-circus/runner', 'testRunner');
  assertEqual(globalTeardown, '<rootDir>/globalTeardown.mjs', 'globalTeardown');
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
