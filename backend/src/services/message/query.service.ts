import { PrismaClient, MessageStatus, Prisma } from '@prisma/client'
import { MessageListQuery, MessageListResponse, UnreadStats } from '../../types/message.types'

const prisma = new PrismaClient()

export class MessageQueryService {
  async getMessages(userId: string, query: MessageListQuery): Promise<MessageListResponse> {
    const { status, category, type, priority, page = 1, limit = 20 } = query

    const where: Prisma.MessageWhereInput = {
      recipientId: userId,
      status: { not: MessageStatus.DELETED },
    }

    if (status && status !== MessageStatus.DELETED) {
      where.status = status
    }
    if (category) {
      where.category = category
    }
    if (type) {
      where.type = type
    }
    if (priority) {
      where.priority = priority
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      prisma.message.count({ where }),
    ])

    // 检查邀请类型消息的状态并清空已处理邀请的actions
    const invitationMessages = messages.filter(m => m.type === 'TRIP_INVITATION' && m.relatedEntity)
    if (invitationMessages.length > 0) {
      const invitationIds = invitationMessages
        .map(m => (m.relatedEntity as any).id)
        .filter(Boolean)
      
      if (invitationIds.length > 0) {
        const invitations = await prisma.tripInvitation.findMany({
          where: { id: { in: invitationIds } },
          select: { id: true, status: true }
        })
        
        // 清空已处理邀请的actions
        messages.forEach(msg => {
          if (msg.type === 'TRIP_INVITATION' && msg.relatedEntity) {
            const invitationId = (msg.relatedEntity as any).id
            const invitation = invitations.find(inv => inv.id === invitationId)
            if (invitation && invitation.status !== 'PENDING') {
              msg.actions = []
            }
          }
        })
      }
    }

    return {
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  }

  async getUnreadStats(userId: string): Promise<UnreadStats> {
    const messages = await prisma.message.findMany({
      where: {
        recipientId: userId,
        status: MessageStatus.UNREAD,
      },
      select: {
        category: true,
        priority: true,
      },
    })

    const byCategory: Record<string, number> = {}
    const byPriority = {
      HIGH: 0,
      NORMAL: 0,
      LOW: 0,
    }

    for (const message of messages) {
      // 按分类统计
      if (message.category) {
        byCategory[message.category] = (byCategory[message.category] || 0) + 1
      }

      // 按优先级统计
      if (message.priority) {
        byPriority[message.priority] = (byPriority[message.priority] || 0) + 1
      }
    }

    return {
      total: messages.length,
      byCategory,
      byPriority,
      hasHighPriority: byPriority.HIGH > 0,
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    const count = await prisma.message.count({
      where: {
        recipientId: userId,
        status: MessageStatus.UNREAD,
      },
    })

    return count
  }

  async getRecentMessages(userId: string, limit: number = 10) {
    const messages = await prisma.message.findMany({
      where: {
        recipientId: userId,
        status: { not: MessageStatus.DELETED },
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
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    return messages
  }
}

export const messageQueryService = new MessageQueryService()