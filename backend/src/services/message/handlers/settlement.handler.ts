import { MessageType, MessagePriority, Message } from '@prisma/client'
import { BaseMessageHandler, MessageContent, ValidationResult } from './base.handler'

export interface SettlementMessageData {
  settlementId: string
  tripId: string
  tripName: string
  fromMemberName: string
  toMemberName: string
  amount: number
  currency: string
  method?: string
  note?: string
  recipientId: string
  settledAt: Date | string
}

export class SettlementCreatedMessageHandler extends BaseMessageHandler {
  readonly type = MessageType.SETTLEMENT_RECEIVED
  readonly priority = MessagePriority.HIGH

  validate(data: SettlementMessageData): ValidationResult {
    const errors: string[] = []

    if (!data.settlementId) {
      errors.push('结算ID不能为空')
    }
    if (!data.tripId) {
      errors.push('行程ID不能为空')
    }
    if (!data.tripName) {
      errors.push('行程名称不能为空')
    }
    if (!data.fromMemberName) {
      errors.push('付款人名称不能为空')
    }
    if (!data.toMemberName) {
      errors.push('收款人名称不能为空')
    }
    if (typeof data.amount !== 'number' || data.amount <= 0) {
      errors.push('结算金额必须大于0')
    }
    if (!data.recipientId) {
      errors.push('接收人ID不能为空')
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  async process(_message: Message, data?: SettlementMessageData): Promise<void> {
    if (!data) return

    await this.sendWebSocketNotification(data.recipientId, 'settlement:created', {
      settlementId: data.settlementId,
      tripId: data.tripId,
      fromMemberName: data.fromMemberName,
      toMemberName: data.toMemberName,
      amount: data.amount,
    })

    this.log('info', `Settlement created notification sent to user ${data.recipientId}`, {
      settlementId: data.settlementId,
      amount: data.amount,
    })
  }

  render(data: SettlementMessageData): MessageContent {
    const isRecipientPayer = data.fromMemberName === data.recipientId
    const isRecipientReceiver = data.toMemberName === data.recipientId

    let title = '新的结算记录'
    let content = ''

    if (isRecipientPayer) {
      title = '您有一笔待支付款项'
      content = `您需要向${data.toMemberName}支付${this.formatCurrency(data.amount, data.currency)}。\n`
      content += `行程：${data.tripName}\n`
    } else if (isRecipientReceiver) {
      title = '您有一笔待收款项'
      content = `${data.fromMemberName}需要向您支付${this.formatCurrency(data.amount, data.currency)}。\n`
      content += `行程：${data.tripName}\n`
    } else {
      content = `${data.fromMemberName}向${data.toMemberName}支付了${this.formatCurrency(data.amount, data.currency)}。\n`
      content += `行程：${data.tripName}\n`
    }

    if (data.method) {
      content += `支付方式：${data.method}\n`
    }

    if (data.note) {
      content += `备注：${data.note}\n`
    }

    content += `\n结算时间：${this.formatDate(data.settledAt)}`

    const actions = []
    if (isRecipientPayer) {
      actions.push({
        type: 'pay',
        label: '确认支付',
        url: `/api/settlements/${data.settlementId}/confirm`,
        method: 'POST',
      })
    } else if (isRecipientReceiver) {
      actions.push({
        type: 'confirm',
        label: '确认收款',
        url: `/api/settlements/${data.settlementId}/confirm`,
        method: 'POST',
      })
    }

    return {
      title,
      content,
      html: this.generateHtml({ title, content }),
      metadata: {
        settlementId: data.settlementId,
        amount: data.amount,
        currency: data.currency,
        fromMemberName: data.fromMemberName,
        toMemberName: data.toMemberName,
      },
      actions,
      relatedEntity: {
        type: 'settlement',
        id: data.settlementId,
        name: `结算-${this.formatCurrency(data.amount, data.currency)}`,
      },
    }
  }
}

export class SettlementConfirmedMessageHandler extends BaseMessageHandler {
  readonly type = MessageType.SETTLEMENT_CONFIRMED
  readonly priority = MessagePriority.NORMAL

  validate(data: any): ValidationResult {
    const errors: string[] = []

    if (!data.settlementId) {
      errors.push('结算ID不能为空')
    }
    if (!data.confirmerName) {
      errors.push('确认人名称不能为空')
    }
    if (!data.amount) {
      errors.push('金额不能为空')
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

    await this.sendWebSocketNotification(data.recipientId, 'settlement:confirmed', {
      settlementId: data.settlementId,
      confirmerName: data.confirmerName,
      amount: data.amount,
    })

    this.log('info', `Settlement confirmed notification sent to user ${data.recipientId}`)
  }

  render(data: any): MessageContent {
    const title = '结算已确认'
    const content = `${data.confirmerName}已确认收到${this.formatCurrency(data.amount, data.currency || 'CNY')}的结算款项。`

    return {
      title,
      content,
      html: this.generateHtml({ title, content }),
      metadata: {
        settlementId: data.settlementId,
        amount: data.amount,
      },
      relatedEntity: {
        type: 'settlement',
        id: data.settlementId,
      },
    }
  }
}

export class SettlementReminderMessageHandler extends BaseMessageHandler {
  readonly type = MessageType.SETTLEMENT_REMINDER
  readonly priority = MessagePriority.NORMAL

  validate(data: any): ValidationResult {
    const errors: string[] = []

    if (!data.settlements || data.settlements.length === 0) {
      errors.push('结算列表不能为空')
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

    await this.sendWebSocketNotification(data.recipientId, 'settlement:reminder', {
      settlements: data.settlements,
      tripName: data.tripName,
      totalAmount: data.totalAmount,
    })

    this.log('info', `Settlement reminder sent to user ${data.recipientId}`)
  }

  render(data: any): MessageContent {
    const title = '待结算提醒'
    
    let content = `您在行程"${data.tripName}"中有待处理的结算：\n\n`
    
    data.settlements.forEach((settlement: any) => {
      content += `• 向${settlement.toMemberName}支付${this.formatCurrency(settlement.amount, settlement.currency || 'CNY')}\n`
    })
    
    if (data.totalAmount) {
      content += `\n总计：${this.formatCurrency(data.totalAmount, data.currency || 'CNY')}`
    }

    content += '\n\n请尽快完成结算。'

    return {
      title,
      content,
      html: this.generateHtml({ title, content }),
      metadata: {
        settlements: data.settlements,
        totalAmount: data.totalAmount,
      },
      actions: [
        {
          type: 'view',
          label: '查看结算详情',
          url: `/trips/${data.tripId}/settlements`,
        },
      ],
      relatedEntity: {
        type: 'trip',
        id: data.tripId,
        name: data.tripName,
      },
    }
  }
}