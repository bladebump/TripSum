import { MessageType, MessagePriority, Message } from '@prisma/client'
import { BaseMessageHandler, MessageContent, ValidationResult } from './base.handler'

export interface SystemMessageData {
  title: string
  content: string
  level?: 'info' | 'warning' | 'error' | 'success'
  recipientId: string
  actions?: Array<{
    type: string
    label: string
    url?: string
  }>
  metadata?: any
}

export class SystemMessageHandler extends BaseMessageHandler {
  readonly type = MessageType.SYSTEM_ANNOUNCEMENT
  readonly priority = MessagePriority.HIGH

  validate(data: SystemMessageData): ValidationResult {
    const errors: string[] = []

    if (!data.title) {
      errors.push('标题不能为空')
    }
    if (!data.content) {
      errors.push('内容不能为空')
    }
    if (!data.recipientId) {
      errors.push('接收人ID不能为空')
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  async process(_message: Message, data?: SystemMessageData): Promise<void> {
    if (!data) return

    await this.sendWebSocketNotification(data.recipientId, 'system:message', {
      title: data.title,
      content: data.content,
      level: data.level || 'info',
    })

    this.log('info', `System message sent to user ${data.recipientId}`, {
      title: data.title,
      level: data.level,
    })
  }

  render(data: SystemMessageData): MessageContent {
    const levelIcon = this.getLevelIcon(data.level)
    const title = `${levelIcon} ${data.title}`

    return {
      title,
      content: data.content,
      html: this.generateSystemHtml(data),
      metadata: {
        level: data.level || 'info',
        ...data.metadata,
      },
      actions: data.actions,
    }
  }

  private getLevelIcon(level?: string): string {
    switch (level) {
      case 'success':
        return '✅'
      case 'warning':
        return '⚠️'
      case 'error':
        return '❌'
      case 'info':
      default:
        return 'ℹ️'
    }
  }

  private generateSystemHtml(data: SystemMessageData): string {
    const levelColor = this.getLevelColor(data.level)
    
    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; 
                  border-left: 4px solid ${levelColor}; padding-left: 20px;">
        <h2 style="color: ${levelColor};">${this.getLevelIcon(data.level)} ${data.title}</h2>
        <div style="color: #666; line-height: 1.6;">
          ${data.content.replace(/\n/g, '<br>')}
        </div>
    `

    if (data.actions && data.actions.length > 0) {
      html += '<div style="margin-top: 20px;">'
      data.actions.forEach(action => {
        html += `
          <a href="${action.url || '#'}" 
             style="display: inline-block; padding: 10px 20px; margin-right: 10px; 
                    background-color: ${levelColor}; color: white; text-decoration: none; 
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

  private getLevelColor(level?: string): string {
    switch (level) {
      case 'success':
        return '#28a745'
      case 'warning':
        return '#ffc107'
      case 'error':
        return '#dc3545'
      case 'info':
      default:
        return '#17a2b8'
    }
  }
}

// 欢迎消息处理器
export class WelcomeMessageHandler extends BaseMessageHandler {
  readonly type = MessageType.SYSTEM_ANNOUNCEMENT
  readonly priority = MessagePriority.LOW

  validate(data: any): ValidationResult {
    const errors: string[] = []

    if (!data.username) {
      errors.push('用户名不能为空')
    }
    if (!data.recipientId) {
      errors.push('接收人ID不能为空')
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  async process(_message: Message, data?: any): Promise<void> {
    if (!data) return

    await this.sendWebSocketNotification(data.recipientId, 'welcome', {
      username: data.username,
    })

    this.log('info', `Welcome message sent to user ${data.recipientId}`)
  }

  render(data: any): MessageContent {
    const title = '欢迎使用TripSum！'
    
    let content = `亲爱的${data.username}，欢迎加入TripSum！\n\n`
    content += 'TripSum是一款专为小型团体设计的旅行费用分摊应用，帮助您：\n'
    content += '• 轻松记录旅行中的共同支出\n'
    content += '• 智能计算每个人应付或应收的金额\n'
    content += '• 实现零和结算，确保账目清晰\n\n'
    content += '开始使用：\n'
    content += '1. 创建或加入一个行程\n'
    content += '2. 记录共同支出\n'
    content += '3. 查看实时余额\n'
    content += '4. 完成结算\n\n'
    content += '如有任何问题，请随时联系我们。祝您旅途愉快！'

    return {
      title,
      content,
      html: this.generateHtml({ title, content }),
      actions: [
        {
          type: 'create_trip',
          label: '创建行程',
          url: '/trips/new',
        },
        {
          type: 'view_guide',
          label: '查看使用指南',
          url: '/guide',
        },
      ],
    }
  }
}

// 成员加入消息处理器
export class MemberJoinedMessageHandler extends BaseMessageHandler {
  readonly type = MessageType.TRIP_MEMBER_JOINED
  readonly priority = MessagePriority.NORMAL

  validate(data: any): ValidationResult {
    const errors: string[] = []

    if (!data.memberName) {
      errors.push('成员名称不能为空')
    }
    if (!data.tripName) {
      errors.push('行程名称不能为空')
    }
    if (!data.tripId) {
      errors.push('行程ID不能为空')
    }
    if (!data.recipientId) {
      errors.push('接收人ID不能为空')
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  async process(_message: Message, data?: any): Promise<void> {
    if (!data) return

    await this.sendWebSocketNotification(data.recipientId, 'member:joined', {
      memberName: data.memberName,
      tripName: data.tripName,
      tripId: data.tripId,
      isReplacement: data.isReplacement,
      replacedMemberName: data.replacedMemberName,
    })

    this.log('info', `Member joined notification sent to user ${data.recipientId}`)
  }

  render(data: any): MessageContent {
    let title = '新成员加入行程'
    let content = ''

    if (data.isReplacement && data.replacedMemberName) {
      title = '虚拟成员已替换'
      content = `${data.memberName}已替换虚拟成员"${data.replacedMemberName}"，加入行程"${data.tripName}"。`
    } else {
      content = `${data.memberName}已加入行程"${data.tripName}"。`
    }

    return {
      title,
      content,
      html: this.generateHtml({ title, content }),
      metadata: {
        memberName: data.memberName,
        isReplacement: data.isReplacement,
        replacedMemberName: data.replacedMemberName,
      },
      relatedEntity: {
        type: 'trip',
        id: data.tripId,
        name: data.tripName,
      },
    }
  }
}