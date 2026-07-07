/**
 * Server-side cache utility for API endpoints
 * Simple in-memory cache with TTL support
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class ServerCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  /**
   * Generate cache key from document ID and parameters
   */
  getCacheKey(documentId: string, params?: Record<string, unknown>): string {
    if (!params || Object.keys(params).length === 0) {
      return documentId;
    }
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as Record<string, unknown>);
    return `${documentId}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Get cached value if exists and not expired
   */
  get<T>(key: string, ttl: number): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * Set cache value
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Invalidate cache entries by document ID
   */
  invalidate(documentId: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(documentId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Singleton instance
export const serverCache = new ServerCache();

// TTL constants (in milliseconds)
export const CACHE_TTL = {
  SCORING: 60 * 60 * 1000,        // 1 hour for scoring results
  VISUALIZATION: 60 * 60 * 1000,  // 1 hour for visualization data
  RESOLVED: 60 * 60 * 1000,       // 1 hour for resolved documents
  METADATA: 5 * 60 * 1000,        // 5 minutes for metadata
  LIBRARY_INDEX: 10 * 60 * 1000   // 10 minutes for library index
};
