import { aiIntentService } from './ai.intent.service'
import { aiService } from './ai.service'
import { memberParser } from './ai.member.parser'
import { ParseResult, MixedParseResult } from '../types/ai.types'
import { io } from '../app'

export class UnifiedAIParser {
  async parseUserInput(tripId: string, text: string, members?: any[], currentUserId?: string): Promise<ParseResult> {
    try {
      // 提取现有成员名称用于意图识别
      const existingMemberNames = members?.map(m => 
        m.isVirtual ? m.displayName : m.user?.username
      ).filter(Boolean) || []
      
      // 第一步：识别意图（传入现有成员信息）
      const intentResult = await aiIntentService.classifyIntent(text, existingMemberNames)
      
      // 第二步：根据意图类型路由到相应的解析器
      let data: any

      switch (intentResult.intent) {
        case 'expense':
          data = await aiService.parseExpenseDescription(tripId, text, members, currentUserId)
          break
          
        case 'contribution':
          // 基金缴纳复用expense解析器，但设置特殊标识
          data = await aiService.parseExpenseDescription(tripId, text, members, currentUserId)
          // 基金缴纳特殊处理
          data.isContribution = true  // 添加基金缴纳标识
          data.payerId = null         // 基金缴纳无付款人
          data.payerName = null
          data.category = '基金'      // 强制设置类别
          break
          
        case 'member':
          data = await memberParser.parseMembers(tripId, text)
          break
          
        case 'mixed':
          data = await this.parseMixedIntent(tripId, text, members, currentUserId)
          break
          
        case 'settlement':
          // TODO: 实现结算解析
          data = { message: '结算功能正在开发中', confidence: 0.3 }
          break
          
        default:
          data = { 
            message: '抱歉，我没有理解您的意思。请尝试描述具体的操作，比如记账或添加成员。',
            confidence: 0.1 
          }
      }

      return {
        intent: intentResult,
        data,
        confidence: Math.min(intentResult.confidence, data.confidence || 0.5)
      }
    } catch (error) {
      console.error('统一解析失败:', error)
      return {
        intent: { intent: 'unknown', confidence: 0 },
        data: { error: '解析失败，请重试' },
        confidence: 0
      }
    }
  }

  private async parseMixedIntent(tripId: string, text: string, members?: any[], currentUserId?: string): Promise<MixedParseResult> {
    try {
      // 并行解析记账和成员信息
      const [expenseResult, memberResult] = await Promise.all([
        aiService.parseExpenseDescription(tripId, text, members, currentUserId),
        memberParser.parseMembers(tripId, text)
      ])

      return {
        expense: expenseResult,
        members: memberResult,
        confidence: Math.min(expenseResult.confidence, memberResult.confidence)
      }
    } catch (error) {
      console.error('混合意图解析失败:', error)
      return {
        expense: { confidence: 0 },
        members: { members: [], confidence: 0 },
        confidence: 0
      }
    }
  }

  async handleMemberAddition(tripId: string, memberNames: string[], addedBy: string) {
    try {
      // 验证成员
      const validation = await memberParser.validateMembers(tripId, memberNames)
      
      if (validation.valid.length === 0) {
        return {
          success: false,
          message: '没有有效的成员名称',
          details: validation
        }
      }

      // 批量添加有效成员
      const addResult = await memberParser.batchAddVirtualMembers(
        tripId, 
        validation.valid, 
        addedBy
      )

      // 通过WebSocket通知其他用户
      if (addResult.added.length > 0) {
        io.to(`trip-${tripId}`).emit('members-added', {
          members: addResult.added,
          addedBy
        })
      }

      return {
        success: true,
        added: addResult.added,
        failed: addResult.failed,
        validation
      }
    } catch (error) {
      console.error('批量添加成员失败:', error)
      return {
        success: false,
        message: '添加成员失败',
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }
}

export const unifiedAIParser = new UnifiedAIParser()