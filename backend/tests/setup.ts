import dotenv from 'dotenv'

// 直接使用开发环境的 .env 文件
dotenv.config()

// 设置测试超时时间
jest.setTimeout(10000)

// Mock console.error 避免测试输出过多
const originalError = console.error
beforeAll(() => {
  console.error = jest.fn()
})

afterAll(() => {
  console.error = originalError
})

// 清理数据库连接
afterAll(async () => {
  // 如果有数据库连接，在这里关闭
  // await prisma.$disconnect()
})