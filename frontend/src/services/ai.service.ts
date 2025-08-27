import api from './api'
import { ApiResponse } from '@/types'

interface IntentResult {
  intent: 'expense' | 'member' | 'settlement' | 'mixed' | 'unknown'
  confidence: number
  subIntents?: Array<{
    intent: string
    confidence: number
  }>
}

interface ParseResult {
  intent: IntentResult
  data: any
  confidence: number
}

interface ParseExpenseResult {
  amount?: number
  participants?: Array<{
    userId: string
    username: string
    shareAmount?: number
    sharePercentage?: number
  }>
  category?: string
  confidence: number
  isIncome?: boolean
}

interface MemberParseResult {
  members: Array<{
    displayName: string
    confidence: number
  }>
  confidence: number
  totalCount?: number
}


interface CategorizeResult {
  category: string
  confidence: number
}

interface SuggestSplitResult {
  splitMethod: 'equal' | 'custom' | 'percentage'
  participants: Array<{
    userId: string
    username: string
    shareAmount?: number
    sharePercentage?: number
    reason?: string
  }>
}

interface AddMembersResult {
  success: boolean
  added: Array<{
    id: string
    displayName: string
    isVirtual: boolean
  }>
  failed: Array<{
    name: string
    error: string
  }>
  validation: {
    valid: string[]
    duplicates: string[]
    invalid: string[]
  }
}

class AIService {
  async parseUserInput(tripId: string, text: string): Promise<ParseResult> {
    const { data } = await api.post<ApiResponse<ParseResult>>('/ai/parse', {
      tripId,
      text,
    })
    if (data.success && data.data) {
      return data.data
    }
    throw new Error('AI解析失败')
  }

  async parseExpense(tripId: string, description: string): Promise<ParseExpenseResult> {
    const { data } = await api.post<ApiResponse<ParseExpenseResult>>('/ai/parse-expense', {
      tripId,
      description,
    })
    if (data.success && data.data) {
      return data.data
    }
    throw new Error('AI解析失败')
  }

  async categorize(description: string): Promise<CategorizeResult> {
    const { data } = await api.post<ApiResponse<CategorizeResult>>('/ai/categorize', {
      description,
    })
    if (data.success && data.data) {
      return data.data
    }
    throw new Error('分类失败')
  }

  async suggestSplit(tripId: string, amount: number, description: string): Promise<SuggestSplitResult> {
    const { data } = await api.post<ApiResponse<SuggestSplitResult>>('/ai/suggest-split', {
      tripId,
      amount,
      description,
    })
    if (data.success && data.data) {
      return data.data
    }
    throw new Error('分摊建议失败')
  }

  async parseMembers(tripId: string, text: string): Promise<MemberParseResult> {
    const { data } = await api.post<ApiResponse<MemberParseResult>>('/ai/parse-members', {
      tripId,
      text,
    })
    if (data.success && data.data) {
      return data.data
    }
    throw new Error('成员解析失败')
  }

  async addMembers(tripId: string, memberNames: string[]): Promise<AddMembersResult> {
    const { data } = await api.post<ApiResponse<AddMembersResult>>('/ai/add-members', {
      tripId,
      memberNames,
    })
    if (data.success && data.data) {
      return data.data
    }
    throw new Error('添加成员失败')
  }
}

export default new AIService()