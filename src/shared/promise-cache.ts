/**
 * Least-recently-used cache of in-flight or settled lookups
 */

export class PromiseCache<T> {
  private readonly entries = new Map<string, Promise<T>>();

  constructor(private readonly maxSize: number) {}

  /**
   * Return the cached lookup for a key, or start one with `load`.
   * Concurrent requests for the same key share one lookup; failures are dropped so the next request retries.
   */
  get(key: string, load: () => Promise<T>): Promise<T> {
    const cached = this.entries.get(key);
    if (cached) {
      // Re-insert so Map order tracks recency
      this.entries.delete(key);
      this.entries.set(key, cached);
      return cached;
    }

    const promise = load();
    this.entries.set(key, promise);
    if (this.entries.size > this.maxSize) {
      this.entries.delete(this.entries.keys().next().value!);
    }

    promise.catch(() => {
      if (this.entries.get(key) === promise) this.entries.delete(key);
    });
    return promise;
  }
}
