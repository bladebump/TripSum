import { Response } from 'express'
import { AuthenticatedRequest } from '../types'
import { aiService } from '../services/ai.service'
import { tripService } from '../services/trip.service'
import { sendSuccess, sendError } from '../utils/response'

export class AIController {
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