import { MessageType, MessagePriority } from '@prisma/client'
import { messageHandlerRegistry } from './handler.registry'
import { messageCrudService } from './crud.service'
import { messageQueue } from '../../queues/message.queue'
import logger from '../../utils/logger'
import { CreateMessageData } from './types'

export class MessageFactoryService {
  /**
   * 创建消息（同步）
   */
  async createMessage(data: CreateMessageData): Promise<any> {
    try {
      // 获取对应的处理器
      const handler = messageHandlerRegistry.getHandler(data.type)
      if (!handler) {
        logger.warn(`No handler found for message type: ${data.type}`)
        // 直接创建消息，不进行特殊处理
        return await messageCrudService.createMessage(data)
      }

      // 验证数据
      const validation = handler.validate(data.metadata || data)
      if (!validation.valid) {
        throw new Error(`Invalid message data: ${validation.errors?.join(', ')}`)
      }

      // 渲染消息内容
      const content = handler.render(data.metadata || data)
      
      // 合并渲染后的内容和原始数据
      const messageData = {
        ...data,
        title: content.title,
        content: content.content,
        metadata: {
          ...data.metadata,
          ...content.metadata,
        },
        actions: content.actions || data.actions,
        relatedEntity: content.relatedEntity || data.relatedEntity,
        priority: data.priority || handler.getPriority(),
      }

      // 创建消息
      const message = await messageCrudService.createMessage(messageData)

      // 处理消息（发送通知等）
      await handler.process(message, data.metadata || data)

      logger.info(`Message created: ${message.id} (type: ${data.type})`)
      return message
    } catch (error) {
      logger.error('Failed to create message:', error)
      throw error
    }
  }

  /**
   * 创建消息（异步，通过队列）
   */
  async createMessageAsync(data: CreateMessageData, priority?: MessagePriority): Promise<void> {
    try {
      // 添加到消息队列
      await messageQueue.addMessage(data, priority || MessagePriority.NORMAL)
      logger.info(`Message queued for async creation (type: ${data.type})`)
    } catch (error) {
      logger.error('Failed to queue message:', error)
      throw error
    }
  }

  /**
   * 批量创建消息
   */
  async createBatchMessages(messages: CreateMessageData[]): Promise<any[]> {
    const results = []
    const errors = []

    for (const data of messages) {
      try {
        const message = await this.createMessage(data)
        results.push(message)
      } catch (error: any) {
        errors.push({
          data,
          error: error?.message || 'Unknown error',
        })
        logger.error(`Failed to create message in batch:`, error)
      }
    }

    if (errors.length > 0) {
      logger.warn(`Batch message creation completed with ${errors.length} errors`)
    }

    return results
  }

  /**
   * 批量创建消息（异步）
   */
  async createBatchMessagesAsync(messages: CreateMessageData[]): Promise<void> {
    const jobs = messages.map(data => ({
      data: {
        type: 'CREATE' as const,
        payload: data,
        priority: data.priority || MessagePriority.NORMAL,
      },
      opts: {
        priority: this.getPriorityValue(data.priority || MessagePriority.NORMAL),
      },
    }))

    await messageQueue.addBulk(jobs)
    logger.info(`${messages.length} messages queued for async batch creation`)
  }

  /**
   * 创建并发送通知
   */
  async createNotification(type: string, data: any, priority?: MessagePriority): Promise<void> {
    await messageQueue.addNotification(type, data, priority || MessagePriority.NORMAL)
    logger.info(`Notification queued (type: ${type})`)
  }

  /**
   * 根据模板创建消息
   */
  async createFromTemplate(
    templateType: MessageType,
    data: any,
    recipientId: string
  ): Promise<any> {
    const handler = messageHandlerRegistry.getHandler(templateType)
    if (!handler) {
      throw new Error(`No handler found for template type: ${templateType}`)
    }

    const messageData: CreateMessageData = {
      recipientId,
      type: templateType,
      title: '', // 将由handler填充
      content: '', // 将由handler填充
      metadata: data,
      priority: handler.getPriority(),
    }

    return this.createMessage(messageData)
  }

  /**
   * 聚合相似消息
   */
  async aggregateMessages(
    messages: CreateMessageData[],
    _timeWindow: number = 300000 // 5分钟
  ): Promise<CreateMessageData[]> {
    const aggregated: CreateMessageData[] = []
    const groups = new Map<string, CreateMessageData[]>()

    // 按类型和接收人分组
    messages.forEach(msg => {
      const key = `${msg.type}:${msg.recipientId}`
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(msg)
    })

    // 聚合每组消息
    groups.forEach((groupMessages, _key) => {
      if (groupMessages.length === 1) {
        aggregated.push(groupMessages[0])
      } else {
        // 聚合多条消息
        const first = groupMessages[0]
        const aggregatedMessage: CreateMessageData = {
          ...first,
          title: `您有${groupMessages.length}条新消息`,
          content: this.aggregateContent(groupMessages),
          metadata: {
            aggregated: true,
            count: groupMessages.length,
            messages: groupMessages.map(m => m.metadata),
          },
        }
        aggregated.push(aggregatedMessage)
      }
    })

    logger.info(`Aggregated ${messages.length} messages into ${aggregated.length}`)
    return aggregated
  }

  /**
   * 聚合消息内容
   */
  private aggregateContent(messages: CreateMessageData[]): string {
    const contents = messages.map((msg, index) => {
      return `${index + 1}. ${msg.title}\n${msg.content}`
    }).join('\n\n')
    
    return contents
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
}

export const messageFactoryService = new MessageFactoryService()