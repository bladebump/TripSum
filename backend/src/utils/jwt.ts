import jwt from 'jsonwebtoken'
import { JwtPayload } from '../types'

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d'

export const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as string | number,
  } as jwt.SignOptions)
}

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ id: userId }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN as string | number,
  } as jwt.SignOptions)
}

export const verifyToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, JWT_SECRET) as any
  return {
    userId: decoded.id || decoded.userId,
    email: decoded.email || '',
    iat: decoded.iat,
    exp: decoded.exp
  }
}

export const verifyRefreshToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as any
  return {
    userId: decoded.id || decoded.userId,
    email: decoded.email || '',
    iat: decoded.iat,
    exp: decoded.exp
  }
}

export const decodeToken = (token: string): JwtPayload | null => {
  return jwt.decode(token) as JwtPayload | null
}