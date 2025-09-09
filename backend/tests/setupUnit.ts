import dotenv from 'dotenv'

// 使用开发环境的 .env 文件
dotenv.config()

// 设置测试超时时间
jest.setTimeout(10000)

// 单元测试使用Mock依赖
// Mock Redis for unit testing
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    keys: jest.fn(),
    hget: jest.fn(),
    hset: jest.fn(),
    hdel: jest.fn(),
    hgetall: jest.fn(),
    zadd: jest.fn(),
    zrange: jest.fn(),
    zrem: jest.fn(),
    zremrangebyrank: jest.fn(),
    on: jest.fn(),
    quit: jest.fn(),
  }))
}))

// Mock Bull for unit testing
jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    process: jest.fn(),
    on: jest.fn(),
    close: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    empty: jest.fn(),
    clean: jest.fn(),
    getJobs: jest.fn(() => []),
    getJobCounts: jest.fn(() => ({ waiting: 0, active: 0, completed: 0, failed: 0 })),
    getWaitingCount: jest.fn(() => 0),
    getActiveCount: jest.fn(() => 0),
    getCompletedCount: jest.fn(() => 0),
    getFailedCount: jest.fn(() => 0),
    getDelayedCount: jest.fn(() => 0),
  }))
})

// Mock Socket.io for unit testing
jest.mock('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    to: jest.fn(() => ({
      emit: jest.fn()
    })),
    in: jest.fn(() => ({
      emit: jest.fn()
    })),
  }))
}))

// Mock Prisma for unit testing (使用jest.mock而不是真实连接)
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn(),
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    trip: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    message: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  })),
}))

// 过滤控制台输出
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || ''
    // 过滤掉一些预期的错误消息
    if (message.includes('Redis Client Error') || 
        message.includes('ECONNREFUSED') ||
        message.includes('Queue error')) {
      return
    }
    originalError(...args)
  }
})

afterAll(() => {
  console.error = originalError
})