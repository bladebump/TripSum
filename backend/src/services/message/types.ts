import { MessageType, MessageCategory, MessagePriority, MessageStatus } from '@prisma/client'

export interface CreateMessageData {
  recipientId: string
  senderId?: string
  type: MessageType
  category?: MessageCategory
  priority?: MessagePriority
  title: string
  content: string
  metadata?: any
  actions?: any[]
  relatedEntity?: any
  expiresAt?: Date
}

export interface MessageQuery {
  status?: MessageStatus
  category?: MessageCategory
  type?: MessageType
  priority?: MessagePriority
  page?: number
  limit?: number
}

export interface MessageListResult {
  messages: any[]
  total: number
  page: number
  totalPages: number
}

export interface UnreadStatistics {
  total: number
  byCategory: Record<string, number>
  byPriority: {
    high: number
    normal: number
    low: number
  }
}

export interface MessagePreference {
  type: MessageType
  enabled: boolean
  channels: string[]
}

export interface BatchOperationResult {
  success: boolean
  count: number
  message: string
}