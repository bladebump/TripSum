import { MessageType, MessagePriority, Message } from '@prisma/client'

export interface MessageContent {
  title: string
  content: string
  html?: string
  metadata?: any
  actions?: MessageAction[]
  relatedEntity?: RelatedEntity
}

export interface MessageAction {
  type: string
  label: string
  url?: string
  method?: string
  params?: any
}

export interface RelatedEntity {
  type: string
  id: string
  name?: string
}

export interface ValidationResult {
  valid: boolean
  errors?: string[]
}

export abstract class BaseMessageHandler {
  abstract readonly type: MessageType
  abstract readonly priority: MessagePriority

  /**
   * 验证消息数据
   */
  abstract validate(data: any): ValidationResult

  /**
   * 处理消息
   */
  abstract process(message: Message, data?: any): Promise<void>

  /**
   * 渲染消息内容
   */
  abstract render(data: any): MessageContent

  /**
   * 获取消息优先级
   */
  getPriority(): MessagePriority {
    return this.priority
  }

  /**
   * 获取消息类型
   */
  getType(): MessageType {
    return this.type
  }

  /**
   * 格式化日期
   */
  protected formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  /**
   * 格式化金额
   */
  protected formatCurrency(amount: number | string, currency = 'CNY'): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency,
    }).format(num)
  }

  /**
   * 生成HTML内容
   */
  protected generateHtml(content: MessageContent): string {
    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${content.title}</h2>
        <div style="color: #666; line-height: 1.6;">
          ${content.content.replace(/\n/g, '<br>')}
        </div>
    `

    if (content.actions && content.actions.length > 0) {
      html += '<div style="margin-top: 20px;">'
      content.actions.forEach(action => {
        html += `
          <a href="${action.url}" 
             style="display: inline-block; padding: 10px 20px; margin-right: 10px; 
                    background-color: #007bff; color: white; text-decoration: none; 
                    border-radius: 5px;">
            ${action.label}
          </a>
        `
      })
      html += '</div>'
    }

    html += '</div>'
    return html
  }

  /**
   * 发送WebSocket通知
   */
  protected async sendWebSocketNotification(userId: string, event: string, data: any) {
    const { io } = await import('../../../app')
    if (io) {
      io.to(`user-${userId}`).emit(event, data)
    }
  }

  /**
   * 日志记录
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const logger = require('../../../utils/logger').default
    logger[level](`[${this.type}] ${message}`, data)
  }
}