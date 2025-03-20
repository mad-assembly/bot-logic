interface CacheEntry<T> {
  pendingPromise: Promise<T> | null
  timestamp: number | null
  result: T | null
}

class Cacher<A extends any[], T> {
  private cacheTime: number
  private callback: (...args: A) => T | Promise<T>
  private cache: Map<string, CacheEntry<T>>

  constructor(cacheTime: number, callback: (...args: A) => T | Promise<T>) {
    this.cacheTime = cacheTime
    this.callback = callback
    this.cache = new Map()
  }

  get(...args: A): T | Promise<T> {
    const key = JSON.stringify(args)
    const cached = this.cache.get(key)

    if (cached?.pendingPromise) {
      return cached.pendingPromise
    }

    if (cached && cached.timestamp && Date.now() - cached.timestamp <= this.cacheTime) {
      return cached.result!
    }

    const result = this.callback(...args)

    if (result instanceof Promise) {
      const entry: CacheEntry<T> = {
        pendingPromise: result,
        timestamp: null,
        result: null,
      }

      this.cache.set(key, entry)

      result
        .then((res) => {
          entry.timestamp = Date.now()
          entry.result = res
          entry.pendingPromise = null
        })
        .catch((err) => {
          this.cache.delete(key)
          throw err
        })

      return result
    }

    this.cache.set(key, {
      pendingPromise: null,
      timestamp: Date.now(),
      result,
    })

    return result
  }

  clear(): void {
    this.cache.clear()
  }
}

export default Cacher
