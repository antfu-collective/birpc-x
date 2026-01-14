export interface RpcCacheOptions {
  functions: string[]
}

export class RpcCacheManager {
  private cacheMap = new Map<string, Map<string, unknown>>()
  private options: RpcCacheOptions

  constructor(options: RpcCacheOptions) {
    this.options = options
  }

  updateOptions(options: Partial<RpcCacheOptions>): void {
    this.options = {
      ...this.options,
      ...options,
    }
  }

  cached<T>(m: string, a: unknown[]): T | undefined {
    const methodCache = this.cacheMap.get(m)
    if (methodCache) {
      return methodCache.get(JSON.stringify(a)) as T
    }
    return undefined
  }

  apply(req: { m: string, a: unknown[] }, res: unknown): void {
    const methodCache = this.cacheMap.get(req.m) || new Map<string, unknown>()
    methodCache.set(JSON.stringify(req.a), res)
    this.cacheMap.set(req.m, methodCache)
  }

  validate(m: string): boolean {
    return this.options.functions.includes(m)
  }

  invalidate(key?: string): void {
    if (key) {
      this.cacheMap.delete(key)
    }
    else {
      this.cacheMap.clear()
    }
  }
}
