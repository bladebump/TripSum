import { Request } from 'express'
import { User } from '@prisma/client'

export interface AuthenticatedRequest extends Request {
  user?: User
  userId?: string
}

export interface JwtPayload {
  userId: string
  email: string
  iat?: number
  exp?: number
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  timestamp: number
}

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginationResult<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface BalanceCalculation {
  memberId: string   // 主要标识符 (TripMember.id)
  userId?: string    // @deprecated 请使用memberId
  username: string
  contribution: number // 基金缴纳
  totalPaid: number // 实际垫付
  totalShare: number // 应该分摊
  balance: number // 余额（正数表示别人欠他，负数表示他欠别人）
  owesTo: Array<{
    memberId: string   // 使用TripMember.id
    userId?: string    // @deprecated 请使用memberId
    username: string
    amount: number
  }>
  owedBy: Array<{
    memberId: string   // 使用TripMember.id
    userId?: string    // @deprecated 请使用memberId
    username: string
    amount: number
  }>
}

export interface Settlement {
  from: {
    memberId: string   // 使用TripMember.id
    userId?: string    // @deprecated 请使用memberId
    username: string
  }
  to: {
    memberId: string   // 使用TripMember.id
    userId?: string    // @deprecated 请使用memberId
    username: string
  }
  amount: number
}

export interface ExpenseParseResult {
  amount?: number
  description?: string
  participants?: Array<{
    memberId: string   // 必需，使用TripMember.id
    userId?: string    // @deprecated 请使用memberId
    username: string
    shareAmount?: number
    sharePercentage?: number
  }>
  category?: string
  confidence: number
}