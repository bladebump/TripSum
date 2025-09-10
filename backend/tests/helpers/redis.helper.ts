import { createClient, RedisClientType } from 'redis'

let testRedisClient: RedisClientType | null = null

/**
 * 获取测试Redis客户端
 */
export async function getTestRedisClient(): Promise<RedisClientType> {
  if (!testRedisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    testRedisClient = createClient({ url: redisUrl })
    
    testRedisClient.on('error', (err) => {
      console.warn('Test Redis Client Error:', err.message)
    })
    
    try {
      await testRedisClient.connect()
    } catch (error: any) {
      console.warn('Failed to connect to Redis for testing:', error.message)
      // 返回一个mock客户端如果Redis不可用
      return createMockRedisClient()
    }
  }
  
  return testRedisClient
}

/**
 * 清理测试Redis数据
 */
export async function cleanupTestRedis(pattern: string = 'test:*') {
  const client = await getTestRedisClient()
  
  try {
    // 只清理测试相关的key
    const keys = await client.keys(pattern)
    if (keys.length > 0) {
      await client.del(keys)
    }
  } catch (error) {
    console.warn('Failed to cleanup Redis test data:', error)
  }
}

/**
 * 关闭测试Redis连接
 */
export async function closeTestRedis() {
  if (testRedisClient) {
    await testRedisClient.quit()
    testRedisClient = null
  }
}

/**
 * 创建一个mock的Redis客户端（当Redis不可用时）
 */
function createMockRedisClient(): any {
  const storage = new Map<string, any>()
  
  return {
    connect: async () => {},
    disconnect: async () => {},
    quit: async () => {},
    get: async (key: string) => storage.get(key) || null,
    set: async (key: string, value: string) => {
      storage.set(key, value)
      return 'OK'
    },
    setex: async (key: string, seconds: number, value: string) => {
      storage.set(key, value)
      return 'OK'
    },
    del: async (keys: string | string[]) => {
      const keysArray = Array.isArray(keys) ? keys : [keys]
      keysArray.forEach(key => storage.delete(key))
      return keysArray.length
    },
    exists: async (key: string) => storage.has(key) ? 1 : 0,
    expire: async (key: string, seconds: number) => 1,
    ttl: async (key: string) => -1,
    keys: async (pattern: string) => {
      const regex = new RegExp(pattern.replace('*', '.*'))
      return Array.from(storage.keys()).filter(key => regex.test(key))
    },
    hget: async (key: string, field: string) => {
      const hash = storage.get(key) || {}
      return hash[field] || null
    },
    hset: async (key: string, field: string, value: string) => {
      const hash = storage.get(key) || {}
      hash[field] = value
      storage.set(key, hash)
      return 1
    },
    hdel: async (key: string, field: string) => {
      const hash = storage.get(key) || {}
      delete hash[field]
      storage.set(key, hash)
      return 1
    },
    hgetall: async (key: string) => storage.get(key) || {},
    on: () => {},
  }
}