import { Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthenticatedRequest } from '../types'
import { verifyToken } from '../utils/jwt'
import { sendError } from '../utils/response'

const prisma = new PrismaClient()

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, '401', '未提供认证令牌', 401)
    }

    const token = authHeader.substring(7)
    
    try {
      const payload = verifyToken(token)
      
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      })

      if (!user) {
        return sendError(res, '401', '用户不存在', 401)
      }

      req.user = user
      req.userId = user.id
      
      next()
    } catch (error) {
      return sendError(res, '401', '无效或过期的令牌', 401)
    }
  } catch (error) {
    return sendError(res, '500', '认证过程出错', 500)
  }
}

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      
      try {
        const payload = verifyToken(token)
        
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
        })

        if (user) {
          req.user = user
          req.userId = user.id
        }
      } catch (error) {
        // 令牌无效但继续处理请求
      }
    }
    
    next()
  } catch (error) {
    next()
  }
}