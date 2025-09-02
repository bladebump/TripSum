import express, { Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { Server } from 'socket.io'
import logger from './utils/logger'
import errorHandler from './middleware/error.middleware'
import routes from './routes'

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

  socket.on('join-trip', (tripId: string) => {
    socket.join(`trip-${tripId}`)
    logger.info(`Socket ${socket.id} joined trip ${tripId}`)
  })

  socket.on('leave-trip', (tripId: string) => {
    socket.leave(`trip-${tripId}`)
    logger.info(`Socket ${socket.id} left trip ${tripId}`)
  })

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`)
  })
})

export { io }

httpServer.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`)
  logger.info(`Environment: ${process.env.NODE_ENV}`)
})