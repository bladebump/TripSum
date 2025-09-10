import api from './api'
import { ApiResponse } from '@/types'

interface IntentResult {
  intent: 'expense' | 'member' | 'settlement' | 'mixed' | 'unknown' | 'contribution' | 'income'
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

// 类型定义已整合到 ParseResult 中

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
  async parseUserInput(tripId: string, text: string, members?: any[]): Promise<ParseResult> {
    // 使用新的统一路由格式
    const { data } = await api.post<ApiResponse<ParseResult>>(`/trips/${tripId}/ai/parse`, {
      text,
      members: members?.map(m => ({
        id: m.id,  // TripMember.id
        userId: m.userId,  // User.id (真实用户)
        name: m.isVirtual ? (m.displayName || '虚拟成员') : (m.user?.username || '未知用户'),
        isVirtual: m.isVirtual || false,
        role: m.role  // 添加role字段用于识别管理员
      }))
    })
    if (data.success && data.data) {
      return data.data
    }
    throw new Error('AI解析失败')
  }

  // 所有解析功能已整合到 parseUserInput 统一处理

  async addMembers(tripId: string, memberNames: string[]): Promise<AddMembersResult> {
    // 使用新的统一路由格式
    const { data } = await api.post<ApiResponse<AddMembersResult>>(`/trips/${tripId}/ai/members`, {
      memberNames,
    })
    if (data.success && data.data) {
      return data.data
    }
    throw new Error('添加成员失败')
  }
}

export default new AIService()