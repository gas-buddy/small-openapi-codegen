import { readSpec } from '../src';

test('Basic function', () => {
  expect(readSpec).toBeTruthy(); // Should export something
  expect(typeof readSpec).toBe('function'); // Should export a function.
});
