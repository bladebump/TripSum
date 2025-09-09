import { ParticipantsSummary, ParticipantDetail, CreateExpenseData } from '../../types/expense.types'

// 扩展CreateExpenseData以匹配服务层需求
export interface ServiceCreateExpenseData extends Omit<CreateExpenseData, 'payerMemberId'> {
  payerId: string  // TripMember.id（兼容旧代码）
}

export interface ExpenseQueryParams {
  page?: number
  limit?: number
  startDate?: Date
  endDate?: Date
  categoryId?: string
  payerId?: string
}

export interface ExpenseListResult {
  expenses: any[]
  total: number
  page: number
  totalPages: number
}

export interface EnhancedExpense {
  id: string
  tripId: string
  amount: any
  categoryId?: string | null
  payerMemberId: string
  description: string
  expenseDate: Date
  receiptUrl?: string | null
  isPaidFromFund: boolean
  createdBy: string
  createdAt: Date
  payerMember: any
  category?: any
  participants: any[]
  participantsSummary?: ParticipantsSummary
}

export { ParticipantsSummary, ParticipantDetail, CreateExpenseData }