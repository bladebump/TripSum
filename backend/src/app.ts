import express, { Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { Server } from 'socket.io'
import logger from './utils/logger'
import errorHandler from './middleware/error.middleware'
import routes from './routes'
import { connectRedis } from './config/redis'
import { queueManager } from './queues'

dotenv.config()

// CORS配置 - 支持IP访问和多域名
let corsOrigins: (string | RegExp)[] = process.env.CLIENT_URL 
  ? process.env.CLIENT_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173']

// 生产环境支持IP访问
if (process.env.NODE_ENV === 'production') {
  corsOrigins.push(/^https?:\/\/\d+\.\d+\.\d+\.\d+(:\d+)?$/) // 支持IP访问（http和https）
}

const app: Express = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    credentials: true,
  },
})

const PORT = process.env.PORT || 3000

app.use(helmet())

app.use(cors({
  origin: corsOrigins,
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api', routes)

app.use(errorHandler)

app.get('/health', (_, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`)

  // 用户认证和加入个人房间
  socket.on('auth', (userId: string) => {
    socket.join(`user-${userId}`)
    logger.info(`Socket ${socket.id} authenticated as user ${userId}`)
  })

  // 加入行程房间
  socket.on('join-trip', (tripId: string) => {
    socket.join(`trip-${tripId}`)
    logger.info(`Socket ${socket.id} joined trip ${tripId}`)
  })

  // 离开行程房间
  socket.on('leave-trip', (tripId: string) => {
    socket.leave(`trip-${tripId}`)
    logger.info(`Socket ${socket.id} left trip ${tripId}`)
  })

  // 离开用户房间
  socket.on('leave-user', (userId: string) => {
    socket.leave(`user-${userId}`)
    logger.info(`Socket ${socket.id} left user room ${userId}`)
  })

  // 获取未读消息数
  socket.on('get-unread-count', async (userId: string) => {
    try {
      const { messageService } = await import('./services/message.service')
      const stats = await messageService.getUnreadStats(userId)
      socket.emit('unread-count', stats.total)
    } catch (error) {
      logger.error('Error getting unread count:', error)
      socket.emit('error', { message: 'Failed to get unread count' })
    }
  })

  // 标记消息已读
  socket.on('mark-message-read', async (data: { userId: string; messageId: string }) => {
    try {
      const { messageService } = await import('./services/message.service')
      await messageService.markAsRead(data.messageId, data.userId)
      socket.emit('message-marked-read', { messageId: data.messageId })
    } catch (error) {
      logger.error('Error marking message as read:', error)
      socket.emit('error', { message: 'Failed to mark message as read' })
    }
  })

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`)
  })
})

export { io }

// 启动服务器
async function startServer() {
  try {
    // 连接Redis
    await connectRedis()
    
    // 启动队列
    await queueManager.startAll()
    logger.info('All queues started successfully')
    
    // 启动HTTP服务器
    httpServer.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`)
      logger.info(`Environment: ${process.env.NODE_ENV}`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server')
  httpServer.close(async () => {
    await queueManager.closeAll()
    logger.info('HTTP server and queues closed')
    process.exit(0)
  })
})

startServer()