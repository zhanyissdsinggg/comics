/**
 * LRU缓存实现
 * 艹！这个SB无限缓存导致内存泄漏，现在用LRU限制缓存大小
 */

export class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    // 移到最后（最近使用）
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    // 如果key已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 添加新的key-value
    this.cache.set(key, value);

    // 超过大小限制时删除最旧的（第一个）
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  has(key) {
    return this.cache.has(key);
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }
}
