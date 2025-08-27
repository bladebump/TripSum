import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt'

const prisma = new PrismaClient()

export class AuthService {
  async register(username: string, email: string, password: string) {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    })

    if (existingUser) {
      throw new Error('用户名或邮箱已存在')
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
      },
    })

    const token = generateToken(user.id)
    const refreshToken = generateRefreshToken(user.id)

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      token,
      refreshToken,
    }
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      throw new Error('邮箱或密码错误')
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

    if (!isPasswordValid) {
      throw new Error('邮箱或密码错误')
    }

    const token = generateToken(user.id)
    const refreshToken = generateRefreshToken(user.id)

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
      token,
      refreshToken,
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = verifyRefreshToken(refreshToken)
      
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      })

      if (!user) {
        throw new Error('用户不存在')
      }

      const newToken = generateToken(user.id)
      const newRefreshToken = generateRefreshToken(user.id)

      return {
        token: newToken,
        refreshToken: newRefreshToken,
      }
    } catch (error) {
      throw new Error('无效的刷新令牌')
    }
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('用户不存在')
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    }
  }

  async updateProfile(userId: string, data: { username?: string; avatarUrl?: string }) {
    if (data.username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: data.username,
          NOT: { id: userId },
        },
      })

      if (existingUser) {
        throw new Error('用户名已被使用')
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
    })

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
    }
  }
}

export const authService = new AuthService()