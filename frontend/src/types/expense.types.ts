import { User } from './user.types'
import { Category, Settlement } from './trip.types'

// 参与者详情接口
export interface ParticipantDetail {
  memberId: string          // TripMember.id作为主要标识符
  name: string             // 参与者显示名称
  shareAmount: number      // 分摊金额
  isVirtual: boolean       // 是否为虚拟成员
}

// 参与者摘要接口
export interface ParticipantsSummary {
  count: number            // 参与者总数
  names: string[]          // 参与者名称列表（用于展示）
  hasMore: boolean         // 是否有更多参与者（超过显示限制）
  averageShare: number     // 平均分摊金额
  totalAmount: number      // 总金额
  details: ParticipantDetail[]  // 参与者详情列表
  isEqualShare: boolean    // 是否平均分摊
}

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
  participantsSummary?: ParticipantsSummary
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

// Settlement interface is imported from trip.types.ts

export interface SettlementSummary {
  settlements: Settlement[]
  summary: {
    totalTransactions: number
    totalAmount: number
  }
}