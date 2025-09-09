import { PrismaClient } from '@prisma/client'
import { SendMessageOptions, MessageTemplateData } from '../../types/message.types'
import { messageCrudService } from './crud.service'

const prisma = new PrismaClient()

export class MessageTemplateService {
  async createMessageFromTemplate(options: SendMessageOptions) {
    const { recipientId, type, templateData, metadata, priority, expiresIn } = options

    // 获取消息模板
    const template = await prisma.messageTemplate.findFirst({
      where: {
        type: type as any,
        locale: 'zh-CN',
        isActive: true,
      },
    })

    if (!template) {
      throw new Error(`消息模板 ${type} 不存在`)
    }

    // 渲染模板
    const title = this.renderTemplate(template.titleTemplate, templateData)
    const content = this.renderTemplate(template.contentTemplate, templateData)

    // 计算过期时间
    let expiresAt: Date | undefined
    if (expiresIn) {
      expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + expiresIn)
    }

    // 创建消息
    return messageCrudService.createMessage({
      recipientId,
      type,
      category: this.getCategoryByType(type),
      priority: priority || 'NORMAL',
      title,
      content,
      metadata,
      actions: template.defaultActions as any || [],
      expiresAt,
    })
  }

  private renderTemplate(template: string, data: MessageTemplateData): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return String(data[key] || match)
    })
  }

  private getCategoryByType(type: string): string {
    if (type.startsWith('TRIP_')) {
      return 'TRIP'
    } else if (type.startsWith('EXPENSE_')) {
      return 'EXPENSE'
    } else if (type.startsWith('SETTLEMENT_')) {
      return 'EXPENSE'
    } else if (type.startsWith('SYSTEM_') || type.startsWith('FEATURE_')) {
      return 'SYSTEM'
    } else {
      return 'NOTIFICATION'
    }
  }

  async getTemplateByType(type: string, locale: string = 'zh-CN') {
    const template = await prisma.messageTemplate.findFirst({
      where: {
        type: type as any,
        locale,
        isActive: true,
      },
    })

    return template
  }

  async createTemplate(data: {
    type: string
    locale: string
    titleTemplate: string
    contentTemplate: string
    defaultActions?: any[]
  }) {
    const template = await prisma.messageTemplate.create({
      data: {
        type: data.type as any,
        locale: data.locale,
        titleTemplate: data.titleTemplate,
        contentTemplate: data.contentTemplate,
        defaultActions: data.defaultActions || [],
        isActive: true,
      },
    })

    return template
  }

  async updateTemplate(id: string, data: {
    titleTemplate?: string
    contentTemplate?: string
    defaultActions?: any[]
    isActive?: boolean
  }) {
    const template = await prisma.messageTemplate.update({
      where: { id },
      data,
    })

    return template
  }
}

export const messageTemplateService = new MessageTemplateService()