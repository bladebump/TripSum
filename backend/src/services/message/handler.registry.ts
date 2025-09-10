import { MessageType } from '@prisma/client'
import { BaseMessageHandler } from './handlers/base.handler'
import { 
  InvitationMessageHandler,
  InvitationAcceptedMessageHandler,
  InvitationRejectedMessageHandler 
} from './handlers/invitation.handler'
import {
  ExpenseCreatedMessageHandler,
  ExpenseUpdatedMessageHandler,
  ExpenseDeletedMessageHandler
} from './handlers/expense.handler'
import {
  SettlementCreatedMessageHandler,
  SettlementConfirmedMessageHandler,
  SettlementReminderMessageHandler
} from './handlers/settlement.handler'
import {
  SystemMessageHandler,
  WelcomeMessageHandler,
  MemberJoinedMessageHandler
} from './handlers/system.handler'
import logger from '../../utils/logger'

export class MessageHandlerRegistry {
  private handlers: Map<MessageType, BaseMessageHandler> = new Map()

  constructor() {
    this.registerDefaultHandlers()
  }

  /**
   * 注册默认处理器
   */
  private registerDefaultHandlers() {
    // 邀请相关
    this.register(new InvitationMessageHandler())
    this.register(new InvitationAcceptedMessageHandler())
    this.register(new InvitationRejectedMessageHandler())

    // 费用相关
    this.register(new ExpenseCreatedMessageHandler())
    this.register(new ExpenseUpdatedMessageHandler())
    this.register(new ExpenseDeletedMessageHandler())

    // 结算相关
    this.register(new SettlementCreatedMessageHandler())
    this.register(new SettlementConfirmedMessageHandler())
    this.register(new SettlementReminderMessageHandler())

    // 系统相关
    this.register(new SystemMessageHandler())
    this.register(new WelcomeMessageHandler())
    this.register(new MemberJoinedMessageHandler())

    logger.info(`Registered ${this.handlers.size} message handlers`)
  }

  /**
   * 注册处理器
   */
  register(handler: BaseMessageHandler) {
    const type = handler.getType()
    if (this.handlers.has(type)) {
      logger.warn(`Handler for message type ${type} already exists, overwriting`)
    }
    this.handlers.set(type, handler)
    logger.info(`Registered handler for message type: ${type}`)
  }

  /**
   * 获取处理器
   */
  getHandler(type: MessageType): BaseMessageHandler | undefined {
    return this.handlers.get(type)
  }

  /**
   * 检查是否有处理器
   */
  hasHandler(type: MessageType): boolean {
    return this.handlers.has(type)
  }

  /**
   * 获取所有处理器类型
   */
  getRegisteredTypes(): MessageType[] {
    return Array.from(this.handlers.keys())
  }

  /**
   * 移除处理器
   */
  unregister(type: MessageType): boolean {
    const result = this.handlers.delete(type)
    if (result) {
      logger.info(`Unregistered handler for message type: ${type}`)
    }
    return result
  }

  /**
   * 清空所有处理器
   */
  clear() {
    this.handlers.clear()
    logger.info('Cleared all message handlers')
  }

  /**
   * 获取处理器统计信息
   */
  getStats() {
    const stats: Record<string, any> = {}
    this.handlers.forEach((handler, type) => {
      stats[type] = {
        priority: handler.getPriority(),
        registered: true,
      }
    })
    return stats
  }
}

// 创建单例实例
export const messageHandlerRegistry = new MessageHandlerRegistry()