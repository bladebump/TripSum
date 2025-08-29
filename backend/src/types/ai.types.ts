export interface IntentResult {
  intent: 'expense' | 'contribution' | 'member' | 'settlement' | 'mixed' | 'unknown'
  confidence: number
  subIntents?: Array<{
    intent: string
    confidence: number
  }>
}

export interface ParseResult {
  intent: IntentResult
  data: any
  confidence: number
}

export interface MemberParseResult {
  members: Array<{
    displayName: string
    confidence: number
  }>
  confidence: number
  totalCount?: number
}

export interface ExpenseParseResult {
  amount?: number
  participants?: Array<{
    memberId?: string     // 使用TripMember.id
    userId?: string       // @deprecated 请使用memberId
    username: string
    shareAmount?: number
    sharePercentage?: number
  }>
  category?: string
  description?: string
  confidence: number
  payerId?: string        // @deprecated 请使用payerMemberId
  payerMemberId?: string  // 使用TripMember.id
  payerName?: string
  isContribution?: boolean  // 用于标识是否为基金缴纳
}

export interface MixedParseResult {
  expense: ExpenseParseResult
  members: MemberParseResult
  confidence: number
}