export interface IntentResult {
  intent: 'expense' | 'member' | 'settlement' | 'mixed' | 'unknown'
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
  isIncome?: boolean
}

export interface MixedParseResult {
  expense: ExpenseParseResult
  members: MemberParseResult
  confidence: number
}