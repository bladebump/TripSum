import { Response } from 'express'
import { AuthenticatedRequest } from '../types'
import { tripService } from '../services/trip.service'
import exportService from '../services/export.service'
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

  async addVirtualMember(req: AuthenticatedRequest, res: Response) {
    try {
      const addedBy = req.userId!
      const { id } = req.params
      const { displayName } = req.body
      const member = await tripService.addVirtualMember(id, displayName, addedBy)
      sendSuccess(res, member, 201)
    } catch (error: any) {
      sendError(res, '400', error.message, 400)
    }
  }

  async removeMember(req: AuthenticatedRequest, res: Response) {
    try {
      const removedBy = req.userId!
      const { id, memberId } = req.params
      const result = await tripService.removeMemberById(id, memberId, removedBy)
      sendSuccess(res, result)
    } catch (error: any) {
      sendError(res, '403', error.message, 403)
    }
  }

  async updateMemberRole(req: AuthenticatedRequest, res: Response) {
    try {
      const updatedBy = req.userId!
      const { id, memberId } = req.params
      const { role } = req.body
      const member = await tripService.updateMemberRoleById(id, memberId, role, updatedBy)
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

  async updateMemberContribution(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const { id, memberId } = req.params
      const { contribution } = req.body
      const member = await tripService.updateMemberContribution(id, memberId, contribution, userId)
      sendSuccess(res, member)
    } catch (error: any) {
      sendError(res, '403', error.message, 403)
    }
  }

  async batchUpdateContributions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const { id } = req.params
      const { contributions } = req.body
      const result = await tripService.batchUpdateContributions(id, contributions, userId)
      sendSuccess(res, result)
    } catch (error: any) {
      sendError(res, '403', error.message, 403)
    }
  }

  async exportTripToExcel(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!
      const { id } = req.params
      
      // 验证用户是否有权限访问该行程
      await tripService.getTripDetail(id, userId)
      
      // 生成Excel文件
      const buffer = await exportService.exportTripToExcel(id)
      
      // 设置响应头
      const filename = `trip_${id}_${new Date().getTime()}.xlsx`
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.setHeader('Content-Length', buffer.length.toString())
      
      // 发送文件
      res.send(buffer)
    } catch (error: any) {
      sendError(res, '403', error.message, 403)
    }
  }
}

export const tripController = new TripController()