const DEFAULT_CAPACITY = 16;
const MAX_LOAD_FACTOR = 0.75;

/**
 * Robin Hood hash table: open addressing with linear probing.
 *
 * When inserting, if the incoming key has probed further than the entry
 * currently occupying the slot, the two are swapped. The displaced entry
 * continues probing. This equalises probe lengths, lowering the variance
 * of lookup cost compared to standard linear probing.
 *
 * Keys and values may be of any type. Keys are compared with `===`,
 * so object keys are compared by reference, not structural equality.
 */
export class RobinHoodHashTable {
  /**
   * @param {number} [capacity=16] Initial number of slots. Must be a positive integer.
   */
  constructor(capacity = DEFAULT_CAPACITY) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error('capacity must be a positive integer');
    }
    this._capacity = capacity;
    this._keys = new Array(capacity);
    this._values = new Array(capacity);
    this._occupied = new Uint8Array(capacity);
    this._size = 0;
  }

  /** Number of stored entries. */
  get size() {
    return this._size;
  }

  /** Current number of slots. */
  get capacity() {
    return this._capacity;
  }

  /**
   * Insert or update the value for `key`.
   * @param {*} key
   * @param {*} value
   */
  set(key, value) {
    if (this._size + 1 > Math.floor(this._capacity * MAX_LOAD_FACTOR)) {
      this._resize(this._capacity * 2);
    }

    let index = this._hash(key) % this._capacity;
    let dist = 0;
    let currentKey = key;
    let currentValue = value;

    while (true) {
      if (this._occupied[index] === 0) {
        this._keys[index] = currentKey;
        this._values[index] = currentValue;
        this._occupied[index] = 1;
        this._size++;
        return;
      }

      if (this._keys[index] === currentKey) {
        this._values[index] = currentValue;
        return;
      }

      const existingDist = (index - this._hash(this._keys[index]) + this._capacity) % this._capacity;
      if (existingDist < dist) {
        const tmpKey = this._keys[index];
        const tmpValue = this._values[index];
        this._keys[index] = currentKey;
        this._values[index] = currentValue;
        currentKey = tmpKey;
        currentValue = tmpValue;
        dist = existingDist;
      }

      index = (index + 1) % this._capacity;
      dist++;
    }
  }

  /**
   * Return the value for `key`, or `undefined` if absent.
   * @param {*} key
   * @returns {*}
   */
  get(key) {
    let index = this._hash(key) % this._capacity;
    let dist = 0;

    while (true) {
      if (this._occupied[index] === 0) {
        return undefined;
      }
      if (this._keys[index] === key) {
        return this._values[index];
      }
      const existingDist = (index - this._hash(this._keys[index]) + this._capacity) % this._capacity;
      if (existingDist < dist) {
        return undefined;
      }
      index = (index + 1) % this._capacity;
      dist++;
    }
  }

  /**
   * Return `true` if `key` is present.
   * @param {*} key
   * @returns {boolean}
   */
  has(key) {
    let index = this._hash(key) % this._capacity;
    let dist = 0;

    while (true) {
      if (this._occupied[index] === 0) {
        return false;
      }
      if (this._keys[index] === key) {
        return true;
      }
      const existingDist = (index - this._hash(this._keys[index]) + this._capacity) % this._capacity;
      if (existingDist < dist) {
        return false;
      }
      index = (index + 1) % this._capacity;
      dist++;
    }
  }

  /**
   * Remove `key` if present. Returns `true` if an entry was removed.
   * @param {*} key
   * @returns {boolean}
   */
  delete(key) {
    let index = this._hash(key) % this._capacity;
    let dist = 0;

    while (true) {
      if (this._occupied[index] === 0) {
        return false;
      }
      if (this._keys[index] === key) {
        break;
      }
      const existingDist = (index - this._hash(this._keys[index]) + this._capacity) % this._capacity;
      if (existingDist < dist) {
        return false;
      }
      index = (index + 1) % this._capacity;
      dist++;
    }

    this._occupied[index] = 0;
    this._keys[index] = undefined;
    this._values[index] = undefined;
    this._size--;

    // Re-insert the following entries in the same cluster to preserve
    // Robin Hood probe-distance invariants.
    let next = (index + 1) % this._capacity;
    while (this._occupied[next] === 1) {
      const keyToMove = this._keys[next];
      const valueToMove = this._values[next];
      this._occupied[next] = 0;
      this._keys[next] = undefined;
      this._values[next] = undefined;
      this._size--;
      this._insertExisting(keyToMove, valueToMove);
      next = (next + 1) % this._capacity;
    }

    return true;
  }

  /**
   * Remove all entries. Capacity is unchanged.
   */
  clear() {
    this._keys = new Array(this._capacity);
    this._values = new Array(this._capacity);
    this._occupied = new Uint8Array(this._capacity);
    this._size = 0;
  }

  /**
   * Iterate over `[key, value]` pairs.
   * @returns {IterableIterator<[*, *]>}
   */
  *entries() {
    for (let i = 0; i < this._capacity; i++) {
      if (this._occupied[i] === 1) {
        yield [this._keys[i], this._values[i]];
      }
    }
  }

  /**
   * Iterate over keys.
   * @returns {IterableIterator<*>}
   */
  *keys() {
    for (const [k] of this.entries()) {
      yield k;
    }
  }

  /**
   * Iterate over values.
   * @returns {IterableIterator<*>}
   */
  *values() {
    for (const [, v] of this.entries()) {
      yield v;
    }
  }

  /**
   * @returns {IterableIterator<[*, *]>}
   */
  [Symbol.iterator]() {
    return this.entries();
  }

  /**
   * Insert an entry that is known not to be a duplicate, without checking
   * the load factor. Used during deletion and resizing.
   * @private
   */
  _insertExisting(key, value) {
    let index = this._hash(key) % this._capacity;
    let dist = 0;
    while (true) {
      if (this._occupied[index] === 0) {
        this._keys[index] = key;
        this._values[index] = value;
        this._occupied[index] = 1;
        this._size++;
        return;
      }
      const existingDist = (index - this._hash(this._keys[index]) + this._capacity) % this._capacity;
      if (existingDist < dist) {
        const tmpKey = this._keys[index];
        const tmpValue = this._values[index];
        this._keys[index] = key;
        this._values[index] = value;
        key = tmpKey;
        value = tmpValue;
        dist = existingDist;
      }
      index = (index + 1) % this._capacity;
      dist++;
    }
  }

  /**
   * Resize the table to `newCapacity` and re-insert all entries.
   * @private
   */
  _resize(newCapacity) {
    const oldKeys = this._keys;
    const oldValues = this._values;
    const oldOccupied = this._occupied;
    const oldCapacity = this._capacity;

    this._capacity = newCapacity;
    this._keys = new Array(newCapacity);
    this._values = new Array(newCapacity);
    this._occupied = new Uint8Array(newCapacity);
    this._size = 0;

    for (let i = 0; i < oldCapacity; i++) {
      if (oldOccupied[i] === 1) {
        this._insertExisting(oldKeys[i], oldValues[i]);
      }
    }
  }

  /**
   * Hash a key to a non-negative integer. Uses a deterministic FNV-1a
   * over the string representation of the key. Object keys hash by
   * their string form; identity is still enforced by `===` during probing.
   * @private
   */
  _hash(key) {
    const str = String(key);
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h;
  }
}
