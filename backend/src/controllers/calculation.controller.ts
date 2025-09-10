import { Response } from 'express'
import { AuthenticatedRequest } from '../types'
import { calculationService } from '../services/calculation.service'
import { tripService } from '../services/trip.service'
import { sendSuccess, sendError } from '../utils/response'

export class CalculationController {
  async getStatistics(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const tripId = req.context!.tripId!
      
      await tripService.getTripDetail(tripId, userId)
      
      const statistics = await calculationService.getTripStatistics(tripId)
      sendSuccess(res, statistics)
    } catch (error: any) {
      sendError(res, '403', error.message, 403)
    }
  }

  async getBalances(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const tripId = req.context!.tripId!
      
      await tripService.getTripDetail(tripId, userId)
      
      const balances = await calculationService.calculateBalances(tripId)
      sendSuccess(res, balances)
    } catch (error: any) {
      sendError(res, '403', error.message, 403)
    }
  }

  async calculateSettlement(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const tripId = req.context!.tripId!
      
      await tripService.getTripDetail(tripId, userId)
      
      const settlements = await calculationService.calculateSettlement(tripId)
      
      const summary = {
        totalTransactions: settlements.length,
        totalAmount: settlements.reduce((sum, s) => sum + s.amount, 0),
      }
      
      sendSuccess(res, {
        settlements,
        summary,
      })
    } catch (error: any) {
      sendError(res, '403', error.message, 403)
    }
  }

  async createSettlements(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const tripId = req.context!.tripId!
      const { settlements } = req.body
      
      await tripService.getTripDetail(tripId, userId)
      
      const result = await calculationService.createSettlements(tripId, settlements)
      sendSuccess(res, result, 201)
    } catch (error: any) {
      sendError(res, '400', error.message, 400)
    }
  }
}

export const calculationController = new CalculationController()