import { PrismaClient } from '@prisma/client'
import { MessagePreferenceDTO } from '../../types/message.types'

const prisma = new PrismaClient()

export class MessagePreferenceService {
  async getUserPreferences(userId: string) {
    const preferences = await prisma.messagePreference.findMany({
      where: { userId },
    })

    // 如果没有偏好设置，返回默认设置
    if (preferences.length === 0) {
      return this.getDefaultPreferences()
    }

    return preferences
  }

  async updateUserPreferences(userId: string, preferences: MessagePreferenceDTO[]) {
    // 删除旧的偏好设置
    await prisma.messagePreference.deleteMany({
      where: { userId },
    })

    // 创建新的偏好设置
    await prisma.messagePreference.createMany({
      data: preferences.map((pref) => ({
        userId,
        messageType: pref.type as any,
        enabled: pref.enabled,
        channels: pref.channels,
        frequency: 'INSTANT' as any,
      })),
    })

    // 返回更新后的偏好设置
    const updatedPreferences = await prisma.messagePreference.findMany({
      where: { userId },
    })

    return updatedPreferences
  }

  async checkUserPreference(userId: string, messageType: string): Promise<boolean> {
    const preference = await prisma.messagePreference.findFirst({
      where: {
        userId,
        messageType: messageType as any,
      },
    })

    // 如果没有找到偏好设置，默认启用
    if (!preference) {
      return true
    }

    return preference.enabled
  }

  async getPreferenceChannels(userId: string, messageType: string): Promise<string[]> {
    const preference = await prisma.messagePreference.findFirst({
      where: {
        userId,
        messageType: messageType as any,
      },
    })

    // 如果没有找到偏好设置，返回默认渠道
    if (!preference) {
      return ['INAPP']
    }

    return preference.channels as string[]
  }

  private getDefaultPreferences() {
    // 返回默认的消息偏好设置
    return [
      {
        type: 'TRIP_INVITATION',
        enabled: true,
        channels: ['INAPP', 'EMAIL'],
      },
      {
        type: 'EXPENSE_CREATED',
        enabled: true,
        channels: ['INAPP'],
      },
      {
        type: 'SETTLEMENT_REQUEST',
        enabled: true,
        channels: ['INAPP', 'EMAIL'],
      },
      {
        type: 'SYSTEM_ANNOUNCEMENT',
        enabled: true,
        channels: ['INAPP'],
      },
    ]
  }
}

export const messagePreferenceService = new MessagePreferenceService()