import { 
  PrismaClient, 
  MessageType, 
  MessageCategory, 
  MessagePriority, 
  MessageStatus,
  Prisma
} from '@prisma/client';
import {
  CreateMessageDTO,
  MessageListQuery,
  MessageListResponse,
  UnreadStats,
  MessagePreferenceDTO,
  BatchMessageOperation,
  SendMessageOptions,
  MessageTemplateData
} from '../types/message.types';

const prisma = new PrismaClient();

export class MessageService {
  /**
   * 创建消息
   */
  async createMessage(data: CreateMessageDTO) {
    const message = await prisma.message.create({
      data: {
        recipientId: data.recipientId,
        senderId: data.senderId,
        type: data.type,
        category: data.category || this.getCategoryByType(data.type),
        priority: data.priority || MessagePriority.NORMAL,
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
    });

    return message;
  }

  /**
   * 根据消息类型推断分类
   */
  private getCategoryByType(type: MessageType): MessageCategory {
    if (type.startsWith('TRIP_')) {
      return MessageCategory.TRIP;
    } else if (type.startsWith('EXPENSE_')) {
      return MessageCategory.EXPENSE;
    } else if (type.startsWith('SETTLEMENT_')) {
      return MessageCategory.EXPENSE;
    } else if (type.startsWith('SYSTEM_') || type.startsWith('FEATURE_')) {
      return MessageCategory.SYSTEM;
    } else {
      return MessageCategory.NOTIFICATION;
    }
  }

  /**
   * 获取消息列表
   */
  async getMessages(userId: string, query: MessageListQuery): Promise<MessageListResponse> {
    const { status, category, type, priority, page = 1, limit = 20 } = query;

    const where: Prisma.MessageWhereInput = {
      recipientId: userId,
      status: { not: MessageStatus.DELETED },
    };

    if (status && status !== MessageStatus.DELETED) {
      where.status = status;
    }
    if (category) {
      where.category = category;
    }
    if (type) {
      where.type = type;
    }
    if (priority) {
      where.priority = priority;
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
    ]);

    return {
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取消息详情
   */
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
    });

    if (!message) {
      throw new Error('消息不存在');
    }

    if (message.recipientId !== userId) {
      throw new Error('无权查看此消息');
    }

    // 自动标记为已读
    if (message.status === MessageStatus.UNREAD) {
      await prisma.message.update({
        where: { id: messageId },
        data: {
          status: MessageStatus.READ,
          readAt: new Date(),
        },
      });
    }

    return message;
  }

  /**
   * 标记消息为已读
   */
  async markAsRead(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('消息不存在');
    }

    if (message.recipientId !== userId) {
      throw new Error('无权操作此消息');
    }

    if (message.status === MessageStatus.UNREAD) {
      const updated = await prisma.message.update({
        where: { id: messageId },
        data: {
          status: MessageStatus.READ,
          readAt: new Date(),
        },
      });
      return updated;
    }

    return message;
  }

  /**
   * 批量标记已读
   */
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
    });

    return { updated: result.count };
  }

  /**
   * 标记所有未读消息为已读
   */
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
    });

    return { updated: result.count };
  }

  /**
   * 归档消息
   */
  async archiveMessage(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('消息不存在');
    }

    if (message.recipientId !== userId) {
      throw new Error('无权操作此消息');
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { status: MessageStatus.ARCHIVED },
    });

    return updated;
  }

  /**
   * 删除消息（软删除）
   */
  async deleteMessage(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('消息不存在');
    }

    if (message.recipientId !== userId) {
      throw new Error('无权操作此消息');
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { status: MessageStatus.DELETED },
    });

    return updated;
  }

  /**
   * 批量操作
   */
  async batchOperation(operation: BatchMessageOperation, userId: string) {
    const { messageIds, operation: op } = operation;

    let updateData: Prisma.MessageUpdateManyArgs['data'] = {};
    
    switch (op) {
      case 'read':
        updateData = {
          status: MessageStatus.READ,
          readAt: new Date(),
        };
        break;
      case 'archive':
        updateData = { status: MessageStatus.ARCHIVED };
        break;
      case 'delete':
        updateData = { status: MessageStatus.DELETED };
        break;
      default:
        throw new Error('不支持的操作类型');
    }

    const result = await prisma.message.updateMany({
      where: {
        id: { in: messageIds },
        recipientId: userId,
        status: { not: MessageStatus.DELETED },
      },
      data: updateData,
    });

    return { updated: result.count };
  }

  /**
   * 获取未读消息统计
   */
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
    });

    const byCategory: Record<MessageCategory, number> = {
      [MessageCategory.SYSTEM]: 0,
      [MessageCategory.TRIP]: 0,
      [MessageCategory.EXPENSE]: 0,
      [MessageCategory.SOCIAL]: 0,
      [MessageCategory.NOTIFICATION]: 0,
    };

    const byPriority = {
      high: 0,
      normal: 0,
      low: 0,
    };

    messages.forEach(msg => {
      byCategory[msg.category]++;
      
      switch (msg.priority) {
        case MessagePriority.HIGH:
          byPriority.high++;
          break;
        case MessagePriority.NORMAL:
          byPriority.normal++;
          break;
        case MessagePriority.LOW:
          byPriority.low++;
          break;
      }
    });

    return {
      total: messages.length,
      byCategory,
      byPriority,
    };
  }

  /**
   * 获取用户消息偏好设置
   */
  async getUserPreferences(userId: string) {
    const preferences = await prisma.messagePreference.findMany({
      where: { userId },
    });

    // 如果没有设置，返回默认设置
    if (preferences.length === 0) {
      return this.getDefaultPreferences();
    }

    return preferences;
  }

  /**
   * 更新用户消息偏好设置
   */
  async updateUserPreferences(userId: string, preferences: MessagePreferenceDTO[]) {
    const operations = preferences.map(pref => 
      prisma.messagePreference.upsert({
        where: {
          userId_messageType: {
            userId,
            messageType: pref.messageType,
          },
        },
        update: {
          channels: pref.channels,
          enabled: pref.enabled,
          frequency: pref.frequency,
        },
        create: {
          userId,
          messageType: pref.messageType,
          channels: pref.channels,
          enabled: pref.enabled,
          frequency: pref.frequency,
        },
      })
    );

    const results = await prisma.$transaction(operations);
    return results;
  }

  /**
   * 获取默认消息偏好设置
   */
  private getDefaultPreferences(): MessagePreferenceDTO[] {
    const messageTypes = Object.values(MessageType);
    
    return messageTypes.map(type => ({
      messageType: type,
      channels: ['inApp'] as ('inApp')[],
      enabled: true,
      frequency: 'INSTANT' as const,
    }));
  }

  /**
   * 根据模板创建消息
   */
  async createMessageFromTemplate(options: SendMessageOptions) {
    const { recipientId, type, templateData, metadata, priority, expiresIn } = options;

    // 获取消息模板
    const template = await prisma.messageTemplate.findFirst({
      where: {
        type,
        locale: 'zh-CN',
        isActive: true,
      },
    });

    if (!template) {
      throw new Error(`消息模板 ${type} 不存在`);
    }

    // 渲染模板
    const title = this.renderTemplate(template.titleTemplate, templateData);
    const content = this.renderTemplate(template.contentTemplate, templateData);

    // 计算过期时间
    let expiresAt: Date | undefined;
    if (expiresIn) {
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresIn);
    }

    // 创建消息
    return this.createMessage({
      recipientId,
      type,
      category: this.getCategoryByType(type),
      priority: priority || MessagePriority.NORMAL,
      title,
      content,
      metadata,
      actions: template.defaultActions as any || [],
      expiresAt,
    });
  }

  /**
   * 渲染消息模板
   */
  private renderTemplate(template: string, data: MessageTemplateData): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return String(data[key] || match);
    });
  }

  /**
   * 清理过期消息
   */
  async cleanupExpiredMessages() {
    const now = new Date();
    
    const result = await prisma.message.deleteMany({
      where: {
        expiresAt: { lt: now },
        status: MessageStatus.UNREAD,
      },
    });

    return result.count;
  }
}

export const messageService = new MessageService();