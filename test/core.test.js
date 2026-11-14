import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RobinHoodHashTable } from '../src/index.js';

test('set and get basic', () => {
  const t = new RobinHoodHashTable();
  t.set('a', 1);
  t.set('b', 2);
  assert.equal(t.get('a'), 1);
  assert.equal(t.get('b'), 2);
  assert.equal(t.get('c'), undefined);
});

test('set overwrites existing key', () => {
  const t = new RobinHoodHashTable();
  t.set('x', 1);
  t.set('x', 2);
  assert.equal(t.get('x'), 2);
  assert.equal(t.size, 1);
});

test('has reflects presence', () => {
  const t = new RobinHoodHashTable();
  t.set('k', 'v');
  assert.equal(t.has('k'), true);
  assert.equal(t.has('missing'), false);
});

test('delete removes and shifts cluster', () => {
  const t = new RobinHoodHashTable(8);
  // Force collisions by using keys that hash to the same slot.
  // We do not know the hash, but we can insert many and delete one.
  for (let i = 0; i < 6; i++) {
    t.set('key' + i, i);
  }
  assert.equal(t.delete('key3'), true);
  assert.equal(t.get('key3'), undefined);
  assert.equal(t.has('key3'), false);
  // Other keys must remain reachable.
  for (let i = 0; i < 6; i++) {
    if (i === 3) continue;
    assert.equal(t.get('key' + i), i);
  }
  assert.equal(t.size, 5);
});

test('delete missing returns false', () => {
  const t = new RobinHoodHashTable();
  assert.equal(t.delete('nope'), false);
});

test('clear empties the table', () => {
  const t = new RobinHoodHashTable();
  t.set('a', 1);
  t.set('b', 2);
  t.clear();
  assert.equal(t.size, 0);
  assert.equal(t.get('a'), undefined);
  assert.equal(t.has('b'), false);
});

test('resize on load factor', () => {
  const t = new RobinHoodHashTable(4);
  // capacity 4, max load 3. Insert 4 to trigger resize.
  t.set('a', 1);
  t.set('b', 2);
  t.set('c', 3);
  assert.equal(t.capacity, 4);
  t.set('d', 4);
  assert.equal(t.capacity, 8);
  assert.equal(t.size, 4);
  assert.equal(t.get('a'), 1);
  assert.equal(t.get('d'), 4);
});

test('iteration yields all entries', () => {
  const t = new RobinHoodHashTable();
  t.set('a', 1);
  t.set('b', 2);
  const entries = [...t.entries()];
  assert.equal(entries.length, 2);
  const map = new Map(entries);
  assert.equal(map.get('a'), 1);
  assert.equal(map.get('b'), 2);
});

test('keys and values iterators', () => {
  const t = new RobinHoodHashTable();
  t.set('a', 1);
  t.set('b', 2);
  assert.deepEqual([...t.keys()].sort(), ['a', 'b']);
  assert.deepEqual([...t.values()].sort(), [1, 2]);
});

test('Symbol.iterator works', () => {
  const t = new RobinHoodHashTable();
  t.set('a', 1);
  const entries = [...t];
  assert.deepEqual(entries, [['a', 1]]);
});

test('constructor rejects invalid capacity', () => {
  assert.throws(() => new RobinHoodHashTable(0), /capacity must be a positive integer/);
  assert.throws(() => new RobinHoodHashTable(-1), /capacity must be a positive integer/);
  assert.throws(() => new RobinHoodHashTable(1.5), /capacity must be a positive integer/);
});

test('robin hood displacement maintains lookups', () => {
  const t = new RobinHoodHashTable(8);
  // Insert keys that are likely to collide.
  const keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  for (let i = 0; i < keys.length; i++) {
    t.set(keys[i], i);
  }
  for (let i = 0; i < keys.length; i++) {
    assert.equal(t.get(keys[i]), i);
  }
});

test('delete then reinsert', () => {
  const t = new RobinHoodHashTable();
  t.set('a', 1);
  t.set('b', 2);
  t.delete('a');
  t.set('a', 3);
  assert.equal(t.get('a'), 3);
  assert.equal(t.get('b'), 2);
  assert.equal(t.size, 2);
});
