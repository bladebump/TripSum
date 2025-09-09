import { PrismaClient, MessageStatus } from '@prisma/client'
import { BatchMessageOperation } from '../../types/message.types'

const prisma = new PrismaClient()

export class MessageBatchService {
  async batchMarkAsRead(messageIds: string[], userId: string) {
    const result = await prisma.message.updateMany({
      where: {
        id: { in: messageIds },
        recipientId: userId,
        status: MessageStatus.UNREAD,
      },
      data: {
        status: MessageStatus.READ,
        readAt: new Date(),
      },
    })

    return {
      success: true,
      count: result.count,
      message: `成功标记 ${result.count} 条消息为已读`,
    }
  }

  async markAllAsRead(userId: string) {
    const result = await prisma.message.updateMany({
      where: {
        recipientId: userId,
        status: MessageStatus.UNREAD,
      },
      data: {
        status: MessageStatus.READ,
        readAt: new Date(),
      },
    })

    return {
      success: true,
      count: result.count,
      message: `成功标记 ${result.count} 条消息为已读`,
    }
  }

  async batchOperation(operation: BatchMessageOperation, userId: string) {
    const { action, messageIds, filters } = operation

    let where: any = {
      recipientId: userId,
      status: { not: MessageStatus.DELETED },
    }

    if (messageIds && messageIds.length > 0) {
      where.id = { in: messageIds }
    } else if (filters) {
      if (filters.category) {
        where.category = filters.category
      }
      if (filters.type) {
        where.type = filters.type
      }
      if (filters.status) {
        where.status = filters.status
      }
    }

    let data: any = {}
    let actionMessage = ''

    switch (action) {
      case 'read':
        data = { status: MessageStatus.READ, readAt: new Date() }
        actionMessage = '标记为已读'
        break
      case 'archive':
        data = { status: MessageStatus.ARCHIVED }
        actionMessage = '归档'
        break
      case 'delete':
        data = { status: MessageStatus.DELETED }
        actionMessage = '删除'
        break
      default:
        throw new Error('不支持的操作')
    }

    const result = await prisma.message.updateMany({
      where,
      data,
    })

    return {
      success: true,
      count: result.count,
      message: `成功${actionMessage} ${result.count} 条消息`,
    }
  }

  async batchArchive(messageIds: string[], userId: string) {
    const result = await prisma.message.updateMany({
      where: {
        id: { in: messageIds },
        recipientId: userId,
        status: { not: MessageStatus.DELETED },
      },
      data: {
        status: MessageStatus.ARCHIVED,
      },
    })

    return {
      success: true,
      count: result.count,
      message: `成功归档 ${result.count} 条消息`,
    }
  }

  async batchDelete(messageIds: string[], userId: string) {
    const result = await prisma.message.updateMany({
      where: {
        id: { in: messageIds },
        recipientId: userId,
      },
      data: {
        status: MessageStatus.DELETED,
      },
    })

    return {
      success: true,
      count: result.count,
      message: `成功删除 ${result.count} 条消息`,
    }
  }
}

export const messageBatchService = new MessageBatchService()