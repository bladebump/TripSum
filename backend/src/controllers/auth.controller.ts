import { Request, Response } from 'express'
import { AuthenticatedRequest } from '../types'
import { authService } from '../services/auth.service'
import { sendSuccess, sendError } from '../utils/response'

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { username, email, password } = req.body
      const result = await authService.register(username, email, password)
      sendSuccess(res, result, 201)
    } catch (error: any) {
      sendError(res, '400', error.message, 400)
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body
      const result = await authService.login(email, password)
      sendSuccess(res, result)
    } catch (error: any) {
      sendError(res, '401', error.message, 401)
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body
      const result = await authService.refreshToken(refreshToken)
      sendSuccess(res, result)
    } catch (error: any) {
      sendError(res, '401', error.message, 401)
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const profile = await authService.getProfile(userId)
      sendSuccess(res, profile)
    } catch (error: any) {
      sendError(res, '404', error.message, 404)
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const result = await authService.updateProfile(userId, req.body)
      sendSuccess(res, result)
    } catch (error: any) {
      sendError(res, '400', error.message, 400)
    }
  }
}

export const authController = new AuthController()