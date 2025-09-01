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
  username: string
  role?: string      // 成员角色 (admin/member)
  contribution: number // 基金缴纳
  totalPaid: number // 实际垫付
  totalShare: number // 应该分摊
  balance: number // 余额（正数表示别人欠他，负数表示他欠别人）
  owesTo: Array<{
    memberId: string   // 使用TripMember.id
    username: string
    amount: number
  }>
  owedBy: Array<{
    memberId: string   // 使用TripMember.id
    username: string
    amount: number
  }>
}

export interface Settlement {
  from: {
    memberId: string   // 使用TripMember.id
    username: string
  }
  to: {
    memberId: string   // 使用TripMember.id
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
  consumptionDate?: string  // 实际消费日期（区别于记账时间）
  payerId?: string          // @deprecated 请使用payerMemberId
  payerMemberId?: string    // 使用TripMember.id
  payerName?: string
  perPersonAmount?: number  // 每人金额（当描述是"每人X元"格式时）
  excludedMembers?: string[] // 被排除的成员
  isContribution?: boolean  // 是否为基金缴纳
}