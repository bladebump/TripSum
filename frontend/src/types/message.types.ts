// 消息类型枚举（与后端Prisma客户端保持一致）
export enum MessageType {
  TRIP_INVITATION = 'TRIP_INVITATION',
  TRIP_INVITATION_ACCEPTED = 'TRIP_INVITATION_ACCEPTED',
  TRIP_INVITATION_REJECTED = 'TRIP_INVITATION_REJECTED',
  TRIP_MEMBER_JOINED = 'TRIP_MEMBER_JOINED',
  TRIP_MEMBER_LEFT = 'TRIP_MEMBER_LEFT',
  TRIP_DELETED = 'TRIP_DELETED',
  EXPENSE_CREATED = 'EXPENSE_CREATED',
  EXPENSE_UPDATED = 'EXPENSE_UPDATED',
  EXPENSE_DELETED = 'EXPENSE_DELETED',
  EXPENSE_MENTIONED = 'EXPENSE_MENTIONED',
  SETTLEMENT_REMINDER = 'SETTLEMENT_REMINDER',
  SETTLEMENT_RECEIVED = 'SETTLEMENT_RECEIVED',
  SETTLEMENT_CONFIRMED = 'SETTLEMENT_CONFIRMED',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  FEATURE_UPDATE = 'FEATURE_UPDATE',
  CUSTOM = 'CUSTOM'
}

// 消息分类
export enum MessageCategory {
  NORMAL = 'NORMAL',
  IMPORTANT = 'IMPORTANT',
  URGENT = 'URGENT'
}

// 消息优先级
export enum MessagePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

// 消息状态
export enum MessageStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED'
}

// 通知频率
export enum NotificationFrequency {
  REAL_TIME = 'REAL_TIME',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  NONE = 'NONE'
}

// 消息操作
export interface MessageAction {
  type: string
  label: string
  url?: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  confirmRequired?: boolean
  confirmText?: string
}

// 关联实体
export interface RelatedEntity {
  type: 'invitation' | 'expense' | 'settlement' | 'trip' | 'member'
  id: string
  additionalData?: any
}

// 消息基础类型
export interface Message {
  id: string
  recipientId: string
  senderId?: string
  type: MessageType
  category: MessageCategory
  priority: MessagePriority
  status: MessageStatus
  title: string
  content: string
  metadata?: any
  actions?: MessageAction[]
  relatedEntity?: RelatedEntity
  readAt?: string
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

// 消息发送者信息
export interface MessageSender {
  id: string
  username: string
  avatarUrl?: string
}

// 带发送者信息的消息
export interface MessageWithSender extends Message {
  sender?: MessageSender
}

// 消息列表查询参数
export interface MessageListQuery {
  status?: MessageStatus
  category?: MessageCategory
  type?: MessageType
  priority?: MessagePriority
  page?: number
  limit?: number
}

// 消息列表响应
export interface MessageListResponse {
  messages: MessageWithSender[]
  total: number
  page: number
  totalPages: number
}

// 未读统计
export interface UnreadStats {
  total: number
  byCategory: Record<MessageCategory, number>
  byPriority: {
    high: number
    normal: number
    low: number
  }
}

// 消息偏好设置
export interface MessagePreference {
  id: string
  userId: string
  messageType: MessageType
  channels: ('inApp' | 'email' | 'push')[]
  enabled: boolean
  frequency: NotificationFrequency
}

// 批量操作请求
export interface BatchMessageOperation {
  messageIds: string[]
}

// 创建消息DTO
export interface CreateMessageDTO {
  recipientId: string
  type: MessageType
  title: string
  content: string
  metadata?: any
  priority?: MessagePriority
  expiresAt?: string
}