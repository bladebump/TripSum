import { Response } from 'express'
import { AuthenticatedRequest } from '../types'
import { tripService } from '../services/trip.service'
import { memberService } from '../services/member.service'
import { unifiedAIParser } from '../services/ai.unified.parser'
import { aiSummaryService } from '../services/ai.summary.service'
import { sendSuccess, sendError } from '../utils/response'
import logger from '../utils/logger'

export class AIController {
  async parseUserInput(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const tripId = req.context!.tripId!
      const { text, members } = req.body
      
      if (!text) {
        return sendError(res, '400', '缺少必要参数', 400)
      }
      
      await tripService.getTripDetail(tripId, userId)
      
      // 使用memberService获取当前用户对应的memberId
      const currentMemberId = await memberService.getMemberIdByUserId(userId, tripId)
      
      if (!currentMemberId) {
        logger.error('无法找到当前用户的成员信息', { userId, tripId })
        return sendError(res, '500', '无法找到当前用户的成员信息', 500)
      }
      
      const result = await unifiedAIParser.parseUserInput(tripId, text.trim(), members, currentMemberId)
      return sendSuccess(res, result)
    } catch (error: any) {
      logger.error('parseUserInput错误:', error)
      return sendError(res, '500', error.message || '服务器内部错误', 500)
    }
  }

  // parseExpense 和 parseMembers 已整合到 parseUserInput 中

  async addMembers(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const tripId = req.context!.tripId!
      const { memberNames } = req.body
      
      if (!Array.isArray(memberNames)) {
        return sendError(res, '400', '缺少必要参数', 400)
      }
      
      // 权限已在路由层通过requireAdmin中间件验证
      const result = await unifiedAIParser.handleMemberAddition(tripId, memberNames, userId)
      return sendSuccess(res, result)
    } catch (error: any) {
      return sendError(res, '400', error.message, 400)
    }
  }

  // categorize 和 suggestSplit 已整合到 parseUserInput 统一处理

  async generateTripSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const tripId = req.context!.tripId!
      
      // 验证用户权限
      await tripService.getTripDetail(tripId, userId)
      
      const summary = await aiSummaryService.generateTripSummary(tripId)
      return sendSuccess(res, summary)
    } catch (error: any) {
      logger.error('生成行程总结失败:', error)
      return sendError(res, '500', error.message || '生成总结失败', 500)
    }
  }

  async exportTripSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const tripId = req.context!.tripId!
      
      // 验证用户权限
      await tripService.getTripDetail(tripId, userId)
      
      const reportBuffer = await aiSummaryService.exportSummaryReport(tripId)
      
      // 设置响应头
      res.setHeader('Content-Type', 'text/html')
      res.setHeader('Content-Disposition', `attachment; filename="trip-summary-${tripId}.html"`)
      
      return res.send(reportBuffer)
    } catch (error: any) {
      logger.error('导出行程总结失败:', error)
      return sendError(res, '500', error.message || '导出失败', 500)
    }
  }
}

export const aiController = new AIController()