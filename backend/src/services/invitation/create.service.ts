import { PrismaClient, InviteType, InvitationStatus } from '@prisma/client'
import { CreateInvitationDTO } from '../../types/invitation.types'
import { notificationService } from '../notification.service'

const prisma = new PrismaClient()

export class InvitationCreateService {
  async createInvitation(
    tripId: string,
    createdBy: string,
    data: CreateInvitationDTO
  ) {
    // 检查用户是否已经在行程中
    const existingMember = await prisma.tripMember.findFirst({
      where: {
        tripId,
        userId: data.invitedUserId,
        isActive: true,
      },
    })

    if (existingMember) {
      throw new Error('该用户已经是行程成员')
    }

    // 检查是否有未处理的邀请
    const pendingInvitation = await prisma.tripInvitation.findFirst({
      where: {
        tripId,
        invitedUserId: data.invitedUserId,
        status: InvitationStatus.PENDING,
      },
    })

    if (pendingInvitation) {
      throw new Error('该用户已有待处理的邀请')
    }

    // 如果是替换模式，验证目标虚拟成员
    if (data.inviteType === InviteType.REPLACE) {
      if (!data.targetMemberId) {
        throw new Error('替换模式必须指定目标成员')
      }

      const targetMember = await prisma.tripMember.findFirst({
        where: {
          id: data.targetMemberId,
          tripId,
          isVirtual: true,
          isActive: true,
        },
      })

      if (!targetMember) {
        throw new Error('目标虚拟成员不存在或无效')
      }
    }

    // 创建邀请记录
    const invitation = await prisma.tripInvitation.create({
      data: {
        tripId,
        invitedUserId: data.invitedUserId,
        inviteType: data.inviteType,
        targetMemberId: data.targetMemberId,
        message: data.message,
        createdBy,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后过期
      },
      include: {
        trip: true,
        inviter: true,
        invitedUser: true,
        targetMember: true,
      },
    })

    // 发送邀请通知
    await notificationService.sendInvitationNotification({
      recipientId: data.invitedUserId,
      inviterId: createdBy,
      inviterName: invitation.inviter.username,
      tripName: invitation.trip.name,
      message: invitation.message || undefined,
      invitationId: invitation.id,
    })

    return invitation
  }

  async cancelInvitation(invitationId: string, userId: string) {
    const invitation = await prisma.tripInvitation.findUnique({
      where: { id: invitationId },
    })

    if (!invitation) {
      throw new Error('邀请不存在')
    }

    if (invitation.createdBy !== userId) {
      throw new Error('无权取消此邀请')
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new Error('只能取消待处理的邀请')
    }

    const updatedInvitation = await prisma.tripInvitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.CANCELLED,
        respondedAt: new Date(),
      },
      include: {
        invitedUser: true,
        trip: true,
      },
    })

    // 通知被邀请人邀请已取消
    await notificationService.sendInvitationRejectedNotification({
      recipientId: updatedInvitation.invitedUserId,
      rejecterName: 'System',
      tripName: updatedInvitation.trip.name,
    })

    return updatedInvitation
  }
}

export const invitationCreateService = new InvitationCreateService()