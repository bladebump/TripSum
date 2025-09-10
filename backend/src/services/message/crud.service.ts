import { PrismaClient, MessageStatus, MessageType } from '@prisma/client'
import { CreateMessageDTO } from '../../types/message.types'

const prisma = new PrismaClient()

export class MessageCrudService {
  async createMessage(data: CreateMessageDTO) {
    const message = await prisma.message.create({
      data: {
        recipientId: data.recipientId,
        senderId: data.senderId,
        type: data.type as any,
        category: (data.category || this.getCategoryByType(data.type)) as any,
        priority: (data.priority || 'NORMAL') as any,
        title: data.title,
        content: data.content,
        metadata: data.metadata || {},
        actions: data.actions as any || [],
        relatedEntity: data.relatedEntity as any || null,
        expiresAt: data.expiresAt,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    })

    return message
  }

  async getMessageById(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    })

    if (!message) {
      throw new Error('消息不存在')
    }

    if (message.recipientId !== userId) {
      throw new Error('无权查看此消息')
    }

    // 如果是邀请消息，检查关联邀请的状态，动态过滤操作按钮
    if (message.type === MessageType.TRIP_INVITATION && message.relatedEntity) {
      const invitationId = (message.relatedEntity as any).id
      if (invitationId) {
        const invitation = await prisma.tripInvitation.findUnique({
          where: { id: invitationId },
          select: { status: true },
        })

        // 如果邀请已被处理（非待处理状态），清空操作按钮
        if (invitation && invitation.status !== 'PENDING') {
          return {
            ...message,
            actions: [], // 清空操作按钮
          }
        }
      }
    }

    return message
  }

  async markAsRead(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    })

    if (!message) {
      throw new Error('消息不存在')
    }

    if (message.recipientId !== userId) {
      throw new Error('无权操作此消息')
    }

    if (message.status !== MessageStatus.UNREAD) {
      return message
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        status: MessageStatus.READ,
        readAt: new Date(),
      },
    })

    return updatedMessage
  }

  async archiveMessage(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    })

    if (!message) {
      throw new Error('消息不存在')
    }

    if (message.recipientId !== userId) {
      throw new Error('无权操作此消息')
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        status: MessageStatus.ARCHIVED,
      },
    })

    return updatedMessage
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    })

    if (!message) {
      throw new Error('消息不存在')
    }

    if (message.recipientId !== userId) {
      throw new Error('无权操作此消息')
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        status: MessageStatus.DELETED,
      },
    })

    return updatedMessage
  }

  async cleanupExpiredMessages() {
    const now = new Date()
    
    const result = await prisma.message.deleteMany({
      where: {
        expiresAt: { lt: now },
        status: MessageStatus.UNREAD,
      },
    })

    return result.count
  }

  private getCategoryByType(type: string): string {
    if (type.startsWith('TRIP_')) {
      return 'TRIP'
    } else if (type.startsWith('EXPENSE_')) {
      return 'EXPENSE'
    } else if (type.startsWith('SETTLEMENT_')) {
      return 'EXPENSE'
    } else if (type.startsWith('SYSTEM_') || type.startsWith('FEATURE_')) {
      return 'SYSTEM'
    } else {
      return 'NOTIFICATION'
    }
  }
}

export const messageCrudService = new MessageCrudService()