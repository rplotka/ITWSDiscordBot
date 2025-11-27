/**
 * The AVA testing library was chosen because it is modern and super simple.
 * https://github.com/avajs/ava
 *
 * This file serves as the main test entry point.
 * Individual test files are in the test/ directory.
 */
const test = require('ava');

// Basic smoke test to ensure test infrastructure works
test('test infrastructure is working', (t) => {
  t.pass();
});
