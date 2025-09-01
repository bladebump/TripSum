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
      
      // 当前用户的ID就是userId（这是真实用户的ID）
      // members中传递的是TripMember.id，需要找对应关系
      const currentMemberId = userId
      
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
      
      // 验证用户权限
      await tripService.getTripDetail(tripId, userId)  // 验证用户是否是成员
      const members = await tripService.getTripMembers(tripId, userId)
      const userMember = members.find((m: any) => m.userId === userId)
      
      if (userMember?.role !== 'admin') {
        return sendError(res, '403', '只有管理员可以添加成员', 403)
      }
      
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
      const { format = 'html' } = req.query
      
      // 验证用户权限
      await tripService.getTripDetail(tripId, userId)
      
      const reportBuffer = await aiSummaryService.exportSummaryReport(
        tripId, 
        format as 'pdf' | 'html'
      )
      
      // 设置响应头
      res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'text/html')
      res.setHeader('Content-Disposition', `attachment; filename="trip-summary-${tripId}.${format}"`)
      
      return res.send(reportBuffer)
    } catch (error: any) {
      logger.error('导出行程总结失败:', error)
      return sendError(res, '500', error.message || '导出失败', 500)
    }
  }
}

export const aiController = new AIController()