import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

// 直接使用开发环境的 .env 文件
dotenv.config()

// 设置测试超时时间
jest.setTimeout(30000)

// 使用真实的Redis和Bull队列，只Mock Socket.io
// Socket.io在测试环境中不需要真实连接
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

// Global test prisma client
export const testPrisma = new PrismaClient()

// 保留console.error用于调试，但过滤掉一些预期的错误
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    // 过滤掉一些预期的错误消息
    const message = args[0]?.toString() || ''
    if (message.includes('Redis Client Error') && message.includes('ECONNREFUSED')) {
      // 忽略Redis连接错误（如果Redis未启动）
      return
    }
    originalError(...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// 清理数据库连接
afterAll(async () => {
  await testPrisma.$disconnect()
})