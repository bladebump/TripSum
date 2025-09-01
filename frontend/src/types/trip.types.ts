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
  contribution: number // 基金缴纳金额
  user?: User
  creator?: User
  totalPaid?: number
  totalShares?: number
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
  fundStatus?: FundStatus
  membersFinancialStatus?: MemberFinancialStatus[]
  settlements?: Settlement[]
  advancedMetrics?: AdvancedMetrics
  timeDistribution?: TimeDistribution
  paymentMethodStats?: PaymentMethodStats
  anomalies?: Anomaly[]
  lastUpdated?: string
}

export interface AdvancedMetrics {
  averagePerPerson: number
  dailyAverage: number
  averagePerExpense: number
  maxExpense: number
  minExpense: number
  peakDay: {
    date: string
    amount: number
    count: number
  } | null
  trend: 'increasing' | 'decreasing' | 'stable'
  memberAverages: MemberAverage[]
  tripDuration: number
  activeConsumers: number
}

export interface MemberAverage {
  memberId: string
  username: string
  averageExpense: number
  dailyAverage: number
}

export interface TimeDistribution {
  morning: TimeSlot
  afternoon: TimeSlot
  evening: TimeSlot
  night: TimeSlot
}

export interface TimeSlot {
  count: number
  amount: number
  percentage: number
}

export interface PaymentMethodStats {
  fundPool: PaymentMethod
  memberReimbursement: PaymentMethod
}

export interface PaymentMethod {
  count: number
  amount: number
  percentage: number
}

export interface Anomaly {
  type: 'high_amount' | 'unusual_time'
  expenseId: string
  description: string
  amount: number
  date: string | Date
  severity: 'high' | 'medium' | 'low'
  message: string
}

export interface FundStatus {
  totalContributions: number
  fundExpenses: number
  memberPaidExpenses: number
  currentBalance: number
  fundUtilization: number
}

export interface MemberFinancialStatus {
  memberId: string
  userId?: string
  username: string
  isVirtual: boolean
  role: 'admin' | 'member'
  contribution: number
  totalPaid: number
  totalShare: number
  balance: number
  expenseCount: number
  paidCount: number
}

export interface Settlement {
  from: {
    memberId: string  // 使用TripMember.id
    userId?: string   // @deprecated 请使用memberId
    username: string
  }
  to: {
    memberId: string  // 使用TripMember.id
    userId?: string   // @deprecated 请使用memberId
    username: string
  }
  amount: number
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