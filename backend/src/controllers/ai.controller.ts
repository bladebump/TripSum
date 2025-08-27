import { Response } from 'express'
import { AuthenticatedRequest } from '../types'
import { aiService } from '../services/ai.service'
import { tripService } from '../services/trip.service'
import { unifiedAIParser } from '../services/ai.unified.parser'
import { memberParser } from '../services/ai.member.parser'
import { sendSuccess, sendError } from '../utils/response'

export class AIController {
  async parseUserInput(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const { tripId, text } = req.body
      
      if (!tripId || !text) {
        return sendError(res, '400', '缺少必要参数', 400)
      }
      
      // 验证用户是否为旅行成员
      await tripService.getTripDetail(tripId, userId)
      
      const result = await unifiedAIParser.parseUserInput(tripId, text.trim())
      return sendSuccess(res, result)
    } catch (error: any) {
      return sendError(res, '400', error.message, 400)
    }
  }

  async parseExpense(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const { tripId, description } = req.body
      
      await tripService.getTripDetail(tripId, userId)
      
      const result = await aiService.parseExpenseDescription(tripId, description)
      sendSuccess(res, result)
    } catch (error: any) {
      sendError(res, '400', error.message, 400)
    }
  }

  async parseMembers(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const { tripId, text } = req.body
      
      if (!tripId || !text) {
        return sendError(res, '400', '缺少必要参数', 400)
      }
      
      // 验证用户权限（只有管理员可以添加成员）
      const trip = await tripService.getTripDetail(tripId, userId)
      const userMember = trip.members?.find(m => m.userId === userId)
      
      if (userMember?.role !== 'admin') {
        return sendError(res, '403', '只有管理员可以添加成员', 403)
      }
      
      const result = await memberParser.parseMembers(tripId, text.trim())
      return sendSuccess(res, result)
    } catch (error: any) {
      return sendError(res, '400', error.message, 400)
    }
  }

  async addMembers(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const { tripId, memberNames } = req.body
      
      if (!tripId || !Array.isArray(memberNames)) {
        return sendError(res, '400', '缺少必要参数', 400)
      }
      
      // 验证用户权限
      const trip = await tripService.getTripDetail(tripId, userId)
      const userMember = trip.members?.find(m => m.userId === userId)
      
      if (userMember?.role !== 'admin') {
        return sendError(res, '403', '只有管理员可以添加成员', 403)
      }
      
      const result = await unifiedAIParser.handleMemberAddition(tripId, memberNames, userId)
      return sendSuccess(res, result)
    } catch (error: any) {
      return sendError(res, '400', error.message, 400)
    }
  }

  async categorize(req: AuthenticatedRequest, res: Response) {
    try {
      const { description } = req.body
      
      const result = await aiService.categorizeExpense(description)
      sendSuccess(res, result)
    } catch (error: any) {
      sendError(res, '400', error.message, 400)
    }
  }

  async suggestSplit(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const { tripId, amount, description } = req.body
      
      await tripService.getTripDetail(tripId, userId)
      
      const result = await aiService.suggestSplitMethod(tripId, amount, description)
      sendSuccess(res, result)
    } catch (error: any) {
      sendError(res, '400', error.message, 400)
    }
  }
}

export const aiController = new AIController()