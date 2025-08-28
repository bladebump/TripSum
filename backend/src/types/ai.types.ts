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
    userId?: string
    username: string
    shareAmount?: number
    sharePercentage?: number
  }>
  category?: string
  description?: string
  confidence: number
  payerId?: string
  payerName?: string
  isContribution?: boolean  // 用于标识是否为基金缴纳
}

export interface MixedParseResult {
  expense: ExpenseParseResult
  members: MemberParseResult
  confidence: number
}