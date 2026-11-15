# robin-hood-hash-table-ts

A hash table that uses Robin Hood hashing with linear probing to keep probe lengths balanced.

```js
import { RobinHoodHashTable } from './src/index.js';

const table = new RobinHoodHashTable();
table.set('name', 'Ada');
table.set('role', 'engineer');

console.log(table.get('name')); // 'Ada'
console.log(table.has('role')); // true

table.delete('role');
console.log(table.size); // 1

for (const [key, value] of table) {
  console.log(key, value);
}
```

## Why this exists

Standard open-addressing tables can develop long probe sequences when keys cluster, which makes worst-case lookups expensive. Robin Hood hashing reduces the variance of probe lengths by swapping a new key with any resident key that has probed a shorter distance. The trade-off is a slightly more involved insertion path and a deletion that must re-insert the remainder of a cluster, but lookups stay closer to the average case.

## Edge cases

- Keys are compared with `===`, so object keys are compared by reference. Two structurally equal objects are different keys.
- The table grows when the next insertion would exceed a load factor of 0.75. The initial capacity is 16 and doubles on resize.
- `delete` re-inserts the rest of the probe cluster to preserve Robin Hood invariants. This is O(cluster length) and is the price paid for stable lookups.
- The hash function is a deterministic FNV-1a over `String(key)`. It is not cryptographic and is not meant to resist adversarial input.
