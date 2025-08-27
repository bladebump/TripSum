import { Response } from 'express'
import { AuthenticatedRequest } from '../types'
import { memberService } from '../services/member.service'
import { sendSuccess, sendError } from '../utils/response'
import logger from '../utils/logger'

export class MemberController {
  async updateContribution(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const { tripId, memberId } = req.params
      const { contribution } = req.body

      logger.info('更新成员基金缴纳:', { tripId, memberId, contribution })

      // 验证权限 - 只有管理员可以更新
      const result = await memberService.updateMemberContribution(
        tripId, 
        memberId, 
        contribution,
        userId
      )
      
      return sendSuccess(res, result)
    } catch (error: any) {
      logger.error('更新成员基金缴纳失败:', error)
      return sendError(res, '500', error.message || '服务器内部错误', 500)
    }
  }

  async batchUpdateContributions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const { tripId } = req.params
      const { contributions } = req.body

      logger.info('批量更新成员基金缴纳:', { tripId, count: contributions.length })

      const result = await memberService.batchUpdateContributions(
        tripId,
        contributions,
        userId
      )
      
      return sendSuccess(res, result)
    } catch (error: any) {
      logger.error('批量更新成员基金缴纳失败:', error)
      return sendError(res, '500', error.message || '服务器内部错误', 500)
    }
  }

  async getMembers(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const { tripId } = req.params

      const members = await memberService.getTripMembers(tripId, userId)
      
      return sendSuccess(res, members)
    } catch (error: any) {
      logger.error('获取成员列表失败:', error)
      return sendError(res, '500', error.message || '服务器内部错误', 500)
    }
  }
}

export const memberController = new MemberController()