import { User } from './user.types'
import { Expense } from './expense.types'

export interface Trip {
  id: string
  name: string
  description?: string
  startDate: string
  endDate?: string
  initialFund: number
  currency: string
  createdBy: string
  createdAt: string
  updatedAt: string
  creator?: User
  members?: TripMember[]
  categories?: Category[]
  expenses?: Expense[]
  statistics?: TripStatistics
  memberCount?: number
  totalExpenses?: number
  myBalance?: number
}

export interface TripMember {
  id: string
  tripId: string
  userId?: string
  role: 'admin' | 'member'
  joinDate: string
  isActive: boolean
  isVirtual?: boolean
  displayName?: string
  createdBy?: string
  user?: User
  creator?: User
  totalPaid?: number
  balance?: number
}

export interface Category {
  id: string
  name: string
  icon?: string
  color?: string
  tripId: string
  isDefault: boolean
}

export interface TripStatistics {
  totalExpenses: number
  expenseCount: number
  averagePerPerson: number
  categoryBreakdown?: CategoryBreakdown[]
  dailyExpenses?: DailyExpense[]
}

export interface CategoryBreakdown {
  categoryId: string
  categoryName: string
  amount: number
  percentage: number
}

export interface DailyExpense {
  date: string
  amount: number
  count: number
}

export interface CreateTripData {
  name: string
  description?: string
  startDate: string
  endDate?: string
  initialFund?: number
  currency?: string
}