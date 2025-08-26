import api from './api'
import { ApiResponse } from '@/types'

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

class AIService {
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
}

export default new AIService()