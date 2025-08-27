import { Request, Response, NextFunction } from 'express'
import logger from '../utils/logger'

interface Error {
  status?: number
  message?: string
  stack?: string
}

const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500
  const message = err.message || 'Internal Server Error'

  logger.error({
    status,
    message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  })

  res.status(status).json({
    success: false,
    error: {
      code: status.toString(),
      message: process.env.NODE_ENV === 'production' ? 'An error occurred' : message,
    },
    timestamp: Date.now(),
  })
}

export default errorHandler