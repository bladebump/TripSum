import { User } from './user.types'
import { Category } from './trip.types'

export interface Expense {
  id: string
  tripId: string
  amount: number
  categoryId?: string
  payerId: string
  description?: string
  expenseDate: string
  receiptUrl?: string
  aiParsedData?: any
  createdBy: string
  createdAt: string
  updatedAt: string
  payer?: User
  category?: Category
  participants?: ExpenseParticipant[]
}

export interface ExpenseParticipant {
  id: string
  expenseId: string
  userId: string
  shareAmount?: number
  sharePercentage?: number
  user?: User
}

export interface CreateExpenseData {
  amount: number
  categoryId?: string
  payerId: string
  description?: string
  expenseDate: string
  participants?: Array<{
    userId: string
    shareAmount?: number
    sharePercentage?: number
  }>
}

export interface BalanceCalculation {
  userId: string
  username: string
  totalPaid: number
  totalShare: number
  balance: number
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