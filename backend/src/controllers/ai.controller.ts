import { Response } from 'express'
import { AuthenticatedRequest } from '../types'
import { tripService } from '../services/trip.service'
import { unifiedAIParser } from '../services/ai.unified.parser'
import { aiSummaryService } from '../services/ai.summary.service'
import { sendSuccess, sendError } from '../utils/response'
import logger from '../utils/logger'

export class AIController {
  async parseUserInput(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const { tripId, text, members } = req.body
      
      logger.info('parseUserInput请求:', { tripId, text, membersCount: members?.length })
      
      if (!tripId || !text) {
        return sendError(res, '400', '缺少必要参数', 400)
      }
      
      // 验证用户是否为旅行成员
      await tripService.getTripDetail(tripId, userId)
      
      // 获取当前用户对应的memberId
      // 需要从行程成员列表中找到userId对应的TripMember.id
      const tripMembers = await tripService.getTripMembers(tripId, userId)
      const currentUserMember = tripMembers.find((m: any) => m.userId === userId)
      
      if (!currentUserMember) {
        logger.error('无法找到当前用户的成员信息', { userId, tripId })
        return sendError(res, '500', '无法找到当前用户的成员信息', 500)
      }
      
      const currentMemberId = currentUserMember.id
      
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
      const { tripId, memberNames } = req.body
      
      if (!tripId || !Array.isArray(memberNames)) {
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
      const { id: tripId } = req.params
      
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
      const { id: tripId } = req.params
      
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