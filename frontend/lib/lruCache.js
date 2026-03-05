/**
 * NOTE: cleaned corrupted comment.
 * NOTE: cleaned corrupted comment.
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

    // 绉诲埌鏈€鍚庯紙鏈€杩戜娇鐢級
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    // 濡傛灉key宸插瓨鍦紝鍏堝垹闄?
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 娣诲姞鏂扮殑key-value
    this.cache.set(key, value);

    // NOTE: cleaned corrupted comment.
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