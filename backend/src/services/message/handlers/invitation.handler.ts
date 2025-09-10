import { MessageType, MessagePriority, Message } from '@prisma/client'
import { BaseMessageHandler, MessageContent, ValidationResult } from './base.handler'

export interface InvitationMessageData {
  invitationId: string
  inviterName: string
  tripName: string
  tripId: string
  inviteType: 'REPLACE' | 'ADD'
  targetMemberName?: string
  message?: string
  recipientId: string
}

export class InvitationMessageHandler extends BaseMessageHandler {
  readonly type = MessageType.TRIP_INVITATION
  readonly priority = MessagePriority.HIGH

  /**
   * 验证邀请消息数据
   */
  validate(data: InvitationMessageData): ValidationResult {
    const errors: string[] = []

    if (!data.invitationId) {
      errors.push('邀请ID不能为空')
    }
    if (!data.inviterName) {
      errors.push('邀请人名称不能为空')
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
    if (!['REPLACE', 'ADD'].includes(data.inviteType)) {
      errors.push('邀请类型无效')
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  /**
   * 处理邀请消息
   */
  async process(_message: Message, data?: InvitationMessageData): Promise<void> {
    if (!data) {
      throw new Error('邀请消息数据不能为空')
    }

    // 发送WebSocket通知
    await this.sendWebSocketNotification(data.recipientId, 'invitation:received', {
      invitationId: data.invitationId,
      inviterName: data.inviterName,
      tripName: data.tripName,
      inviteType: data.inviteType,
      targetMemberName: data.targetMemberName,
    })

    // 记录日志
    this.log('info', `Invitation message sent to user ${data.recipientId}`, {
      invitationId: data.invitationId,
      tripId: data.tripId,
    })
  }

  /**
   * 渲染邀请消息内容
   */
  render(data: InvitationMessageData): MessageContent {
    let title = `${data.inviterName}邀请您加入行程`
    let content = `${data.inviterName}邀请您加入行程"${data.tripName}"。`

    if (data.inviteType === 'REPLACE' && data.targetMemberName) {
      content += `\n您将替换虚拟成员"${data.targetMemberName}"，继承其所有历史数据。`
    }

    if (data.message) {
      content += `\n\n留言：${data.message}`
    }

    return {
      title,
      content,
      html: this.generateHtml({ title, content }),
      metadata: {
        invitationId: data.invitationId,
        inviteType: data.inviteType,
        targetMemberName: data.targetMemberName,
      },
      actions: [
        {
          type: 'accept',
          label: '接受邀请',
          url: `/api/invitations/${data.invitationId}/accept`,
          method: 'POST',
        },
        {
          type: 'reject',
          label: '拒绝邀请',
          url: `/api/invitations/${data.invitationId}/reject`,
          method: 'POST',
        },
      ],
      relatedEntity: {
        type: 'invitation',
        id: data.invitationId,
        name: data.tripName,
      },
    }
  }
}

// 邀请接受消息处理器
export class InvitationAcceptedMessageHandler extends BaseMessageHandler {
  readonly type = MessageType.TRIP_INVITATION_ACCEPTED
  readonly priority = MessagePriority.NORMAL

  validate(data: any): ValidationResult {
    const errors: string[] = []

    if (!data.accepterName) {
      errors.push('接受人名称不能为空')
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

    await this.sendWebSocketNotification(data.recipientId, 'invitation:accepted', {
      accepterName: data.accepterName,
      tripName: data.tripName,
      tripId: data.tripId,
    })

    this.log('info', `Invitation accepted notification sent to user ${data.recipientId}`)
  }

  render(data: any): MessageContent {
    const title = '邀请已被接受'
    const content = `${data.accepterName}接受了您的邀请，已加入行程"${data.tripName}"。`

    return {
      title,
      content,
      html: this.generateHtml({ title, content }),
      relatedEntity: {
        type: 'trip',
        id: data.tripId,
        name: data.tripName,
      },
    }
  }
}

// 邀请拒绝消息处理器
export class InvitationRejectedMessageHandler extends BaseMessageHandler {
  readonly type = MessageType.TRIP_INVITATION_REJECTED
  readonly priority = MessagePriority.NORMAL

  validate(data: any): ValidationResult {
    const errors: string[] = []

    if (!data.rejecterName) {
      errors.push('拒绝人名称不能为空')
    }
    if (!data.tripName) {
      errors.push('行程名称不能为空')
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

    await this.sendWebSocketNotification(data.recipientId, 'invitation:rejected', {
      rejecterName: data.rejecterName,
      tripName: data.tripName,
    })

    this.log('info', `Invitation rejected notification sent to user ${data.recipientId}`)
  }

  render(data: any): MessageContent {
    const title = '邀请已被拒绝'
    const content = `${data.rejecterName}拒绝了您的邀请加入行程"${data.tripName}"的请求。`

    return {
      title,
      content,
      html: this.generateHtml({ title, content }),
    }
  }
}