import { User } from './user.types'
import { Category } from './trip.types'

export interface Expense {
  id: string
  tripId: string
  amount: number
  categoryId?: string
  payerId?: string  // 旧字段，兼容
  payerMemberId?: string  // 新字段
  description?: string
  expenseDate: string
  receiptUrl?: string
  aiParsedData?: any
  isPaidFromFund?: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
  payer?: User  // 旧字段，兼容
  payerMember?: {
    id: string
    isVirtual: boolean
    displayName?: string
    user?: User
  }
  category?: Category
  participants?: ExpenseParticipant[]
  participantsSummary?: {
    count: number
    names: string[]
    hasMore: boolean
    averageShare: number
    totalAmount: number
    details: Array<{
      memberId: string
      name: string
      shareAmount: number
      isVirtual: boolean
    }>
    isEqualShare: boolean
  }
}

export interface ExpenseParticipant {
  id: string
  expenseId: string
  tripMemberId: string  // 主要使用TripMember.id
  shareAmount?: number
  sharePercentage?: number
  tripMember?: {
    id: string
    isVirtual: boolean
    displayName?: string
    user?: User
  }
}

export interface CreateExpenseData {
  amount: number
  categoryId?: string
  payerId: string  // TripMember.id
  description?: string
  expenseDate: string
  participants?: Array<{
    memberId: string  // TripMember.id (必需)
    shareAmount?: number
    sharePercentage?: number
  }>
}

export interface BalanceCalculation {
  memberId: string  // 主要使用memberId
  userId?: string   // 保留以兼容
  username: string
  contribution: number // 基金缴纳
  totalPaid: number // 实际垫付
  totalShare: number // 应该分摊
  balance: number // 最终余额
  owesTo: Array<{
    memberId: string
    username: string
    amount: number
  }>
  owedBy: Array<{
    memberId: string
    username: string
    amount: number
  }>
}

export interface Settlement {
  from: {
    memberId: string
    username: string
  }
  to: {
    memberId: string
    username: string
  }
  amount: number
}

export interface SettlementSummary {
  settlements: Settlement[]
  summary: {
    totalTransactions: number
    totalAmount: number
  }
}