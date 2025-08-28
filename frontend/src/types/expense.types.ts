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
}

export interface ExpenseParticipant {
  id: string
  expenseId: string
  userId?: string  // Optional for virtual members
  tripMemberId?: string  // TripMember.id for virtual members
  shareAmount?: number
  sharePercentage?: number
  user?: User
}

export interface CreateExpenseData {
  amount: number
  categoryId?: string
  payerId: string  // TripMember.id
  description?: string
  expenseDate: string
  participants?: Array<{
    userId?: string  // Optional for virtual members
    memberId: string  // TripMember.id (required)
    shareAmount?: number
    sharePercentage?: number
  }>
}

export interface BalanceCalculation {
  userId: string
  username: string
  contribution: number // 基金缴纳
  totalPaid: number // 实际垫付
  totalShare: number // 应该分摊
  balance: number // 最终余额
  owesTo: Array<{
    userId: string
    username: string
    amount: number
  }>
  owedBy: Array<{
    userId: string
    username: string
    amount: number
  }>
}

export interface Settlement {
  from: {
    userId: string
    username: string
  }
  to: {
    userId: string
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