import { PrismaClient } from '@prisma/client'
import { io } from '../../app'
import { CreateTripData } from './types'
import { tripPermissionService } from './permission.service'
import { tripMemberService } from './member.service'
import { tripStatisticsService } from './statistics.service'

const prisma = new PrismaClient()

export class TripService {
  // Permission service
  checkTripPermission = tripPermissionService.checkTripPermission.bind(tripPermissionService)
  
  // Member service delegation
  addMember = tripMemberService.addMember.bind(tripMemberService)
  addVirtualMember = tripMemberService.addVirtualMember.bind(tripMemberService)
  removeMemberById = tripMemberService.removeMemberById.bind(tripMemberService)
  removeMember = tripMemberService.removeMember.bind(tripMemberService)
  updateMemberRoleById = tripMemberService.updateMemberRoleById.bind(tripMemberService)
  updateMemberRole = tripMemberService.updateMemberRole.bind(tripMemberService)
  getTripMembers = tripMemberService.getTripMembers.bind(tripMemberService)
  updateMemberContribution = tripMemberService.updateMemberContribution.bind(tripMemberService)
  batchUpdateContributions = tripMemberService.batchUpdateContributions.bind(tripMemberService)
  
  // Statistics service delegation
  getUserTrips = tripStatisticsService.getTripStatisticsForList.bind(tripStatisticsService)

  async createTrip(userId: string, data: CreateTripData) {
    const trip = await prisma.trip.create({
      data: {
        ...data,
        createdBy: userId,
        members: {
          create: {
            userId,
            role: 'admin',
          },
        },
        categories: {
          createMany: {
            data: [
              { name: '餐饮', icon: '🍽️', color: '#FF6B6B', isDefault: true },
              { name: '交通', icon: '🚗', color: '#4ECDC4', isDefault: true },
              { name: '住宿', icon: '🏨', color: '#45B7D1', isDefault: true },
              { name: '娱乐', icon: '🎮', color: '#96CEB4', isDefault: true },
              { name: '购物', icon: '🛒', color: '#FFEAA7', isDefault: true },
              { name: '其他', icon: '📦', color: '#DFE6E9', isDefault: true },
            ],
          },
        },
      },
      include: {
        creator: true,
        members: {
          include: {
            user: true,
          },
        },
      },
    })

    return trip
  }

  async getTripDetail(tripId: string, userId: string) {
    // 首先验证用户是否为行程成员
    const memberCheck = await prisma.tripMember.findFirst({
      where: {
        tripId,
        userId,
        isActive: true
      }
    })

    if (!memberCheck) {
      throw new Error('您不是该行程的成员')
    }

    // 只返回行程基础信息和分类
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        creator: true,
        categories: true,
        // 不再包含 members 和 expenses
      },
    })

    if (!trip) {
      throw new Error('行程不存在')
    }

    return trip
  }

  async updateTrip(tripId: string, userId: string, data: Partial<CreateTripData>) {
    await tripPermissionService.checkTripPermission(tripId, userId, 'admin')

    const trip = await prisma.trip.update({
      where: { id: tripId },
      data,
      include: {
        creator: true,
        categories: true,
      },
    })

    return trip
  }

  async deleteTrip(tripId: string, userId: string) {
    await tripPermissionService.checkTripPermission(tripId, userId, 'admin')

    await prisma.trip.delete({
      where: { id: tripId },
    })

    io.to(`trip-${tripId}`).emit('trip-deleted', { tripId })

    return { success: true }
  }
}

export const tripService = new TripService()