import { Response } from 'express'
import { AuthenticatedRequest } from '../types'
import { expenseService } from '../services/expense.service'
import { sendSuccess, sendError } from '../utils/response'

export class ExpenseController {
  async createExpense(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const { id: tripId } = req.params
      
      let expenseData = req.body
      
      if (req.file) {
        expenseData.receiptUrl = req.file.path
      }
      
      if (typeof expenseData.participants === 'string') {
        expenseData.participants = JSON.parse(expenseData.participants)
      }
      
      const expense = await expenseService.createExpense(tripId, userId, expenseData)
      sendSuccess(res, expense, 201)
    } catch (error: any) {
      sendError(res, '400', error.message, 400)
    }
  }

  async getTripExpenses(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const { id: tripId } = req.params
      const { page = 1, limit = 20, startDate, endDate, categoryId, payerId } = req.query
      
      const filters: any = {}
      if (startDate) filters.startDate = new Date(startDate as string)
      if (endDate) filters.endDate = new Date(endDate as string)
      if (categoryId) filters.categoryId = categoryId as string
      if (payerId) filters.payerId = payerId as string
      
      const result = await expenseService.getTripExpenses(
        tripId,
        userId,
        Number(page),
        Number(limit),
        filters
      )
      sendSuccess(res, result)
    } catch (error: any) {
      sendError(res, '403', error.message, 403)
    }
  }

  async getExpenseDetail(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const { id } = req.params
      const expense = await expenseService.getExpenseDetail(id, userId)
      sendSuccess(res, expense)
    } catch (error: any) {
      sendError(res, '404', error.message, 404)
    }
  }

  async updateExpense(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const { id } = req.params
      
      let expenseData = req.body
      
      if (req.file) {
        expenseData.receiptUrl = req.file.path
      }
      
      if (typeof expenseData.participants === 'string') {
        expenseData.participants = JSON.parse(expenseData.participants)
      }
      
      const expense = await expenseService.updateExpense(id, userId, expenseData)
      sendSuccess(res, expense)
    } catch (error: any) {
      sendError(res, '403', error.message, 403)
    }
  }

  async deleteExpense(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const { id } = req.params
      const result = await expenseService.deleteExpense(id, userId)
      sendSuccess(res, result)
    } catch (error: any) {
      sendError(res, '403', error.message, 403)
    }
  }
}

export const expenseController = new ExpenseController()