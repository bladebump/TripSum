import { MessageType, MessagePriority } from '@prisma/client'
import { messageFactoryService } from './factory.service'
import { messagePreferenceService } from './preference.service'
import logger from '../../utils/logger'
import { CreateMessageData } from './types'

export interface DispatchOptions {
  channels?: string[]
  priority?: MessagePriority
  aggregate?: boolean
  aggregateWindow?: number
}

export class MessageDispatcherService {
  private pendingMessages: Map<string, CreateMessageData[]> = new Map()
  private aggregateTimers: Map<string, NodeJS.Timeout> = new Map()

  /**
   * 发送消息到多个渠道
   */
  async dispatch(data: CreateMessageData, options: DispatchOptions = {}): Promise<void> {
    try {
      // 检查用户偏好
      const preferences = await messagePreferenceService.getUserPreferences(data.recipientId)
      const preference = preferences.find((p: any) => p.messageType === data.type)
      
      if (!preference || !preference.enabled) {
        logger.info(`Message type ${data.type} is disabled for user ${data.recipientId}`)
        return
      }

      // 确定发送渠道
      const channels = options.channels || (preference?.channels as string[]) || ['in_app']
      
      // 如果需要聚合
      if (options.aggregate) {
        await this.aggregateAndDispatch(data, options)
        return
      }

      // 立即发送
      await this.sendToChannels(data, channels, options.priority)
    } catch (error) {
      logger.error('Failed to dispatch message:', error)
      throw error
    }
  }

  /**
   * 批量发送消息
   */
  async dispatchBatch(
    messages: CreateMessageData[],
    options: DispatchOptions = {}
  ): Promise<void> {
    const tasks = messages.map(msg => this.dispatch(msg, options))
    await Promise.all(tasks)
    logger.info(`Dispatched ${messages.length} messages`)
  }

  /**
   * 广播消息给多个用户
   */
  async broadcast(
    recipientIds: string[],
    data: Omit<CreateMessageData, 'recipientId'>,
    options: DispatchOptions = {}
  ): Promise<void> {
    const messages = recipientIds.map(recipientId => ({
      ...data,
      recipientId,
    }))

    await this.dispatchBatch(messages, options)
    logger.info(`Broadcast message to ${recipientIds.length} users`)
  }

  /**
   * 聚合并发送消息
   */
  private async aggregateAndDispatch(
    data: CreateMessageData,
    options: DispatchOptions
  ): Promise<void> {
    const key = `${data.type}:${data.recipientId}`
    
    // 添加到待发送列表
    if (!this.pendingMessages.has(key)) {
      this.pendingMessages.set(key, [])
    }
    this.pendingMessages.get(key)!.push(data)

    // 清除现有定时器
    if (this.aggregateTimers.has(key)) {
      clearTimeout(this.aggregateTimers.get(key)!)
    }

    // 设置新的定时器
    const timer = setTimeout(async () => {
      const messages = this.pendingMessages.get(key) || []
      if (messages.length > 0) {
        // 聚合消息
        const aggregated = await messageFactoryService.aggregateMessages(
          messages,
          options.aggregateWindow
        )
        
        // 发送聚合后的消息
        for (const msg of aggregated) {
          await this.sendToChannels(
            msg,
            options.channels || ['in_app'],
            options.priority
          )
        }

        // 清理
        this.pendingMessages.delete(key)
        this.aggregateTimers.delete(key)
      }
    }, options.aggregateWindow || 300000) // 默认5分钟

    this.aggregateTimers.set(key, timer)
  }

  /**
   * 发送到指定渠道
   */
  private async sendToChannels(
    data: CreateMessageData,
    channels: string[],
    _priority?: MessagePriority
  ): Promise<void> {
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'in_app':
            // 创建站内消息
            await messageFactoryService.createMessage(data)
            break
          case 'email':
            // TODO: 实现邮件发送
            logger.info(`Email channel not implemented yet for message type ${data.type}`)
            break
          case 'push':
            // TODO: 实现推送通知
            logger.info(`Push channel not implemented yet for message type ${data.type}`)
            break
          case 'sms':
            // TODO: 实现短信发送
            logger.info(`SMS channel not implemented yet for message type ${data.type}`)
            break
          default:
            logger.warn(`Unknown channel: ${channel}`)
        }
      } catch (error) {
        logger.error(`Failed to send message to channel ${channel}:`, error)
      }
    }
  }

  /**
   * 发送系统通知
   */
  async sendSystemNotification(
    recipientId: string,
    title: string,
    content: string,
    level: 'info' | 'warning' | 'error' | 'success' = 'info'
  ): Promise<void> {
    const data: CreateMessageData = {
      recipientId,
      type: MessageType.SYSTEM_ANNOUNCEMENT,
      title,
      content,
      priority: level === 'error' ? MessagePriority.HIGH : MessagePriority.NORMAL,
      metadata: { level },
    }

    await this.dispatch(data)
  }

  /**
   * 发送欢迎消息
   */
  async sendWelcomeMessage(userId: string, username: string): Promise<void> {
    const data: CreateMessageData = {
      recipientId: userId,
      type: MessageType.SYSTEM_ANNOUNCEMENT,
      title: '欢迎使用TripSum！',
      content: '', // 将由handler填充
      priority: MessagePriority.LOW,
      metadata: { username, recipientId: userId },
    }

    await this.dispatch(data)
  }

  /**
   * 清理待发送消息
   */
  clearPendingMessages() {
    this.aggregateTimers.forEach(timer => clearTimeout(timer))
    this.aggregateTimers.clear()
    this.pendingMessages.clear()
    logger.info('Cleared all pending messages')
  }
}

export const messageDispatcherService = new MessageDispatcherService()