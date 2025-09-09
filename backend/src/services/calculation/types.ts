export interface BalanceCalculation {
  memberId: string
  username: string
  role?: string
  contribution: number
  totalPaid: number
  totalShare: number
  balance: number
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
  details?: {
    paidExpenses: any[]
    sharedExpenses: any[]
  }
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

export interface TripStatistics {
  totalExpenses: number
  expenseCount: number
  averagePerPerson: number
  categoryBreakdown: CategoryBreakdown[]
  fundPoolStatus: FundPoolStatus
  membersFinancialStatus: MemberFinancialStatus[]
  paymentMethodStats: PaymentMethodStats
  timeDistribution?: TimeDistribution
  advancedMetrics?: AdvancedMetrics
  fundStatus?: FundStatus
  anomalies?: Anomaly[]
}

export interface CategoryBreakdown {
  categoryId: string
  categoryName: string
  amount: number
  percentage: number
  count: number
}

export interface FundPoolStatus {
  totalContributions: number
  totalExpenses: number
  remainingBalance: number
  utilizationRate: number
}

export interface MemberFinancialStatus {
  memberId: string
  memberName: string
  isVirtual: boolean
  contribution: number
  totalPaid: number
  totalShare: number
  balance: number
  reimburseAmount?: number
}

export interface PaymentMethodStats {
  fundPool: {
    count: number
    amount: number
    percentage: number
  }
  memberReimbursement: {
    count: number
    amount: number
    percentage: number
  }
}

export interface TimeDistribution {
  morning: { count: number; amount: number; percentage: number }
  afternoon: { count: number; amount: number; percentage: number }
  evening: { count: number; amount: number; percentage: number }
  night: { count: number; amount: number; percentage: number }
}

export interface AdvancedMetrics {
  dailyAverage: number
  peakDay: {
    date: string
    amount: number
    count: number
  } | null
  trend: 'increasing' | 'decreasing' | 'stable'
  activeConsumers: number
  tripDuration: number
}

export interface FundStatus {
  fundUtilization: number
}

export interface Anomaly {
  type: string
  message: string
  severity: string
  data?: any
}