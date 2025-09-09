import { MessageType, MessagePriority, Message } from '@prisma/client'
import { BaseMessageHandler, MessageContent, ValidationResult } from './base.handler'

export interface ExpenseMessageData {
  expenseId: string
  tripId: string
  tripName: string
  payerName: string
  amount: number
  currency: string
  category?: string
  description?: string
  participants: Array<{
    name: string
    share: number
  }>
  recipientId: string
  createdAt: Date | string
}

export class ExpenseCreatedMessageHandler extends BaseMessageHandler {
  readonly type = MessageType.EXPENSE_CREATED
  readonly priority = MessagePriority.NORMAL

  validate(data: ExpenseMessageData): ValidationResult {
    const errors: string[] = []

    if (!data.expenseId) {
      errors.push('费用ID不能为空')
    }
    if (!data.tripId) {
      errors.push('行程ID不能为空')
    }
    if (!data.tripName) {
      errors.push('行程名称不能为空')
    }
    if (!data.payerName) {
      errors.push('付款人名称不能为空')
    }
    if (typeof data.amount !== 'number' || data.amount <= 0) {
      errors.push('金额必须大于0')
    }
    if (!data.participants || data.participants.length === 0) {
      errors.push('参与者列表不能为空')
    }
    if (!data.recipientId) {
      errors.push('接收人ID不能为空')
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  async process(_message: Message, data?: ExpenseMessageData): Promise<void> {
    if (!data) return

    // 发送WebSocket通知
    await this.sendWebSocketNotification(data.recipientId, 'expense:created', {
      expenseId: data.expenseId,
      tripId: data.tripId,
      payerName: data.payerName,
      amount: data.amount,
      category: data.category,
    })

    this.log('info', `Expense created notification sent to user ${data.recipientId}`, {
      expenseId: data.expenseId,
      amount: data.amount,
    })
  }

  render(data: ExpenseMessageData): MessageContent {
    const title = '新的费用记录'
    
    let content = `${data.payerName}在行程"${data.tripName}"中添加了一笔费用。\n`
    content += `金额：${this.formatCurrency(data.amount, data.currency)}\n`
    
    if (data.category) {
      content += `类别：${data.category}\n`
    }
    
    if (data.description) {
      content += `描述：${data.description}\n`
    }

    // 找到接收人的分摊金额
    const recipientShare = data.participants.find(p => p.name === data.recipientId)
    if (recipientShare) {
      content += `\n您需要分摊：${this.formatCurrency(recipientShare.share, data.currency)}`
    }

    content += `\n\n记录时间：${this.formatDate(data.createdAt)}`

    return {
      title,
      content,
      html: this.generateHtml({ title, content }),
      metadata: {
        expenseId: data.expenseId,
        amount: data.amount,
        currency: data.currency,
        participants: data.participants,
      },
      relatedEntity: {
        type: 'expense',
        id: data.expenseId,
        name: data.description || '费用',
      },
    }
  }
}

export class ExpenseUpdatedMessageHandler extends BaseMessageHandler {
  readonly type = MessageType.EXPENSE_UPDATED
  readonly priority = MessagePriority.NORMAL

  validate(data: ExpenseMessageData): ValidationResult {
    // 使用相同的验证逻辑
    return new ExpenseCreatedMessageHandler().validate(data)
  }

  async process(_message: Message, data?: ExpenseMessageData): Promise<void> {
    if (!data) return

    await this.sendWebSocketNotification(data.recipientId, 'expense:updated', {
      expenseId: data.expenseId,
      tripId: data.tripId,
      payerName: data.payerName,
      amount: data.amount,
    })

    this.log('info', `Expense updated notification sent to user ${data.recipientId}`)
  }

  render(data: ExpenseMessageData): MessageContent {
    const title = '费用记录已更新'
    
    let content = `${data.payerName}更新了行程"${data.tripName}"中的一笔费用。\n`
    content += `新金额：${this.formatCurrency(data.amount, data.currency)}\n`
    
    if (data.description) {
      content += `描述：${data.description}\n`
    }

    const recipientShare = data.participants.find(p => p.name === data.recipientId)
    if (recipientShare) {
      content += `\n您的分摊金额已更新为：${this.formatCurrency(recipientShare.share, data.currency)}`
    }

    return {
      title,
      content,
      html: this.generateHtml({ title, content }),
      metadata: {
        expenseId: data.expenseId,
        amount: data.amount,
        currency: data.currency,
      },
      relatedEntity: {
        type: 'expense',
        id: data.expenseId,
        name: data.description || '费用',
      },
    }
  }
}

export class ExpenseDeletedMessageHandler extends BaseMessageHandler {
  readonly type = MessageType.EXPENSE_DELETED
  readonly priority = MessagePriority.LOW

  validate(data: any): ValidationResult {
    const errors: string[] = []

    if (!data.expenseId) {
      errors.push('费用ID不能为空')
    }
    if (!data.tripName) {
      errors.push('行程名称不能为空')
    }
    if (!data.deleterName) {
      errors.push('删除人名称不能为空')
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

    await this.sendWebSocketNotification(data.recipientId, 'expense:deleted', {
      expenseId: data.expenseId,
      tripId: data.tripId,
      deleterName: data.deleterName,
    })

    this.log('info', `Expense deleted notification sent to user ${data.recipientId}`)
  }

  render(data: any): MessageContent {
    const title = '费用记录已删除'
    const content = `${data.deleterName}删除了行程"${data.tripName}"中的一笔费用。`

    return {
      title,
      content,
      html: this.generateHtml({ title, content }),
      metadata: {
        expenseId: data.expenseId,
      },
    }
  }
}