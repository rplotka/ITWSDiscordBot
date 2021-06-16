/**
 * The AVA testing library was chosen because it is modern and super simple.
 * https://github.com/avajs/ava
 */
const test = require('ava');

const utils = require('./core/utils');

test('simple parseCommandAndArgs works', (t) => {
  t.deepEqual(utils.parseCommandAndArgs('echo hello world'), [
    'echo',
    ['hello', 'world'],
  ]);
});

test('complex parseCommandAndArgs works', (t) => {
  t.deepEqual(
    utils.parseCommandAndArgs('EcHo "hello world" arg2 "argument three"'),
    ['echo', ['hello world', 'arg2', 'argument three']]
  );
});
