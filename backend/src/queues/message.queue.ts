import { Job } from 'bull'
import { BaseQueue } from './base.queue'
import { messageService } from '../services/message.service'
import { notificationService } from '../services/notification.service'
import logger from '../utils/logger'
import { MessagePriority } from '@prisma/client'

export interface MessageJobData {
  type: 'CREATE' | 'SEND' | 'BATCH_SEND' | 'NOTIFICATION'
  payload: any
  priority?: MessagePriority
  retryCount?: number
}

export class MessageQueue extends BaseQueue<MessageJobData> {
  constructor() {
    super({
      name: 'message-queue',
      defaultJobOptions: {
        removeOnComplete: 100, // 保留最近100个完成的任务
        removeOnFail: 1000, // 保留最近1000个失败的任务
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    })
  }

  /**
   * 处理消息任务
   */
  protected async process(job: Job<MessageJobData>): Promise<any> {
    const { type, payload, priority } = job.data

    // 根据优先级设置处理延迟
    if (priority === MessagePriority.LOW) {
      await this.delay(1000) // 低优先级延迟1秒
    }

    switch (type) {
      case 'CREATE':
        return this.processCreateMessage(payload)
      case 'SEND':
        return this.processSendMessage(payload)
      case 'BATCH_SEND':
        return this.processBatchSend(payload)
      case 'NOTIFICATION':
        return this.processNotification(payload)
      default:
        throw new Error(`Unknown message job type: ${type}`)
    }
  }

  /**
   * 处理创建消息
   */
  private async processCreateMessage(payload: any) {
    try {
      const message = await messageService.createMessage(payload)
      logger.info(`Message created: ${message.id}`)
      
      // 创建成功后，添加发送任务
      await this.addSendTask(message)
      
      return message
    } catch (error) {
      logger.error('Failed to create message:', error)
      throw error
    }
  }

  /**
   * 处理发送消息
   */
  private async processSendMessage(payload: any) {
    try {
      const { messageId, channels } = payload
      
      // 获取消息详情
      const message = await messageService.getMessageById(messageId, payload.recipientId || '')
      if (!message) {
        throw new Error(`Message not found: ${messageId}`)
      }

      // 根据渠道发送
      const results = []
      for (const channel of channels || ['in_app']) {
        switch (channel) {
          case 'in_app':
            // 站内消息已经创建，只需要通过WebSocket通知
            await this.sendWebSocketNotification(message)
            results.push({ channel: 'in_app', success: true })
            break
          case 'email':
            // 预留邮件发送接口
            logger.info(`Email sending not implemented yet for message ${messageId}`)
            results.push({ channel: 'email', success: false, reason: 'Not implemented' })
            break
          case 'push':
            // 预留推送通知接口
            logger.info(`Push notification not implemented yet for message ${messageId}`)
            results.push({ channel: 'push', success: false, reason: 'Not implemented' })
            break
          default:
            logger.warn(`Unknown channel: ${channel}`)
        }
      }

      return results
    } catch (error) {
      logger.error('Failed to send message:', error)
      throw error
    }
  }

  /**
   * 处理批量发送
   */
  private async processBatchSend(payload: any) {
    try {
      const { messages, channels } = payload
      const results = []

      for (const message of messages) {
        try {
          const result = await this.processSendMessage({
            messageId: message.id,
            channels,
          })
          results.push({ messageId: message.id, success: true, result })
        } catch (error: any) {
          results.push({ messageId: message.id, success: false, error: error?.message || 'Unknown error' })
        }
      }

      return results
    } catch (error) {
      logger.error('Failed to batch send messages:', error)
      throw error
    }
  }

  /**
   * 处理通知
   */
  private async processNotification(payload: any) {
    try {
      const { type, data } = payload

      switch (type) {
        case 'invitation':
          return await notificationService.sendInvitationNotification(data)
        case 'invitation_accepted':
          return await notificationService.sendInvitationAcceptedNotification(data)
        case 'invitation_rejected':
          return await notificationService.sendInvitationRejectedNotification(data)
        case 'member_joined':
          return await notificationService.sendMemberJoinedNotification(data)
        case 'expense_created':
          return await notificationService.sendExpenseCreatedNotification(data)
        case 'settlement_created':
          // TODO: Implement settlement notification
          logger.warn('Settlement notification not implemented')
          return null
        default:
          logger.warn(`Unknown notification type: ${type}`)
          return null
      }
    } catch (error) {
      logger.error('Failed to process notification:', error)
      throw error
    }
  }

  /**
   * 通过WebSocket发送通知
   */
  private async sendWebSocketNotification(message: any) {
    const io = require('../app').io
    if (io) {
      // 发送到用户的个人房间
      io.to(`user-${message.recipientId}`).emit('message:new', message)
      logger.info(`WebSocket notification sent to user ${message.recipientId}`)
    }
  }

  /**
   * 添加发送任务
   */
  private async addSendTask(message: any) {
    // 检查用户偏好设置
    const preferences = await messageService.getUserPreferences(message.recipientId)
    const preference = preferences.find((p: any) => p.messageType === message.type)
    
    if (preference && preference.enabled) {
      const channels = preference.channels || ['in_app']
      
      // 根据消息优先级设置延迟
      let delay = 0
      if (message.priority === MessagePriority.LOW) {
        delay = 5000 // 低优先级延迟5秒
      } else if (message.priority === MessagePriority.NORMAL) {
        delay = 1000 // 普通优先级延迟1秒
      }
      // 高优先级立即发送

      await this.add(
        {
          type: 'SEND',
          payload: {
            messageId: message.id,
            channels,
          },
          priority: message.priority,
        },
        {
          delay,
          priority: this.getPriorityValue(message.priority),
        }
      )
    }
  }

  /**
   * 获取优先级数值
   */
  private getPriorityValue(priority: MessagePriority): number {
    switch (priority) {
      case MessagePriority.HIGH:
        return 1
      case MessagePriority.NORMAL:
        return 5
      case MessagePriority.LOW:
        return 10
      default:
        return 5
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 添加消息到队列
   */
  async addMessage(data: any, priority: MessagePriority = MessagePriority.NORMAL) {
    return this.add(
      {
        type: 'CREATE',
        payload: data,
        priority,
      },
      {
        priority: this.getPriorityValue(priority),
      }
    )
  }

  /**
   * 添加通知到队列
   */
  async addNotification(type: string, data: any, priority: MessagePriority = MessagePriority.NORMAL) {
    return this.add(
      {
        type: 'NOTIFICATION',
        payload: { type, data },
        priority,
      },
      {
        priority: this.getPriorityValue(priority),
      }
    )
  }
}

// 创建单例实例
export const messageQueue = new MessageQueue()