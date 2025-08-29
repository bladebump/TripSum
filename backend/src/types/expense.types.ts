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

// 支出接口（扩展Prisma生成的类型）
export interface ExpenseWithSummary {
  participantsSummary?: ParticipantsSummary
}

// 创建支出数据接口
export interface CreateExpenseData {
  amount: number
  description?: string
  expenseDate: Date | string
  categoryId?: string
  payerMemberId: string  // 使用TripMember.id
  isPaidFromFund?: boolean
  participants: Array<{
    memberId: string     // 使用TripMember.id
    shareAmount?: number
    sharePercentage?: number
  }>
  receiptUrl?: string
  aiParsedData?: any
}

// 更新支出数据接口
export interface UpdateExpenseData {
  amount?: number
  description?: string
  expenseDate?: Date | string
  categoryId?: string
  payerMemberId?: string
  isPaidFromFund?: boolean
  participants?: Array<{
    memberId: string
    shareAmount?: number
    sharePercentage?: number
  }>
  receiptUrl?: string
}