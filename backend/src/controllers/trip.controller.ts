import { Response } from 'express'
import { AuthenticatedRequest } from '../types'
import { tripService } from '../services/trip.service'
import { sendSuccess, sendError } from '../utils/response'

export class TripController {
  async createTrip(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const trip = await tripService.createTrip(userId, req.body)
      sendSuccess(res, trip, 201)
    } catch (error: any) {
      sendError(res, '400', error.message, 400)
    }
  }

  async getUserTrips(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const { page = 1, limit = 10, status = 'all' } = req.query
      const result = await tripService.getUserTrips(
        userId,
        Number(page),
        Number(limit),
        status as string
      )
      sendSuccess(res, result)
    } catch (error: any) {
      sendError(res, '400', error.message, 400)
    }
  }

  async getTripDetail(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const { id } = req.params
      const trip = await tripService.getTripDetail(id, userId)
      sendSuccess(res, trip)
    } catch (error: any) {
      sendError(res, '404', error.message, 404)
    }
  }

  async updateTrip(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const { id } = req.params
      const trip = await tripService.updateTrip(id, userId, req.body)
      sendSuccess(res, trip)
    } catch (error: any) {
      sendError(res, '403', error.message, 403)
    }
  }

  async deleteTrip(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const { id } = req.params
      const result = await tripService.deleteTrip(id, userId)
      sendSuccess(res, result)
    } catch (error: any) {
      sendError(res, '403', error.message, 403)
    }
  }

  async addMember(req: AuthenticatedRequest, res: Response) {
    try {
      const addedBy = req.userId!
      const { id } = req.params
      const { userId, role = 'member' } = req.body
      const member = await tripService.addMember(id, userId, role, addedBy)
      sendSuccess(res, member, 201)
    } catch (error: any) {
      sendError(res, '400', error.message, 400)
    }
  }

  async removeMember(req: AuthenticatedRequest, res: Response) {
    try {
      const removedBy = req.userId!
      const { id, userId } = req.params
      const result = await tripService.removeMember(id, userId, removedBy)
      sendSuccess(res, result)
    } catch (error: any) {
      sendError(res, '403', error.message, 403)
    }
  }

  async updateMemberRole(req: AuthenticatedRequest, res: Response) {
    try {
      const updatedBy = req.userId!
      const { id, userId } = req.params
      const { role } = req.body
      const member = await tripService.updateMemberRole(id, userId, role, updatedBy)
      sendSuccess(res, member)
    } catch (error: any) {
      sendError(res, '403', error.message, 403)
    }
  }

  async getTripMembers(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const { id } = req.params
      const members = await tripService.getTripMembers(id, userId)
      sendSuccess(res, members)
    } catch (error: any) {
      sendError(res, '403', error.message, 403)
    }
  }
}

export const tripController = new TripController()