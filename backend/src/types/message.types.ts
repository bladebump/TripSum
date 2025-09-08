import { 
  Message, 
  MessageType, 
  MessageCategory, 
  MessagePriority, 
  MessageStatus,
  NotificationFrequency,
  User 
} from '@prisma/client';

export interface CreateMessageDTO {
  recipientId: string;
  senderId?: string;
  type: MessageType;
  category: MessageCategory;
  priority?: MessagePriority;
  title: string;
  content: string;
  metadata?: any;
  actions?: MessageAction[];
  relatedEntity?: RelatedEntity;
  expiresAt?: Date;
}

export interface MessageAction {
  type: string;
  label: string;
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  confirmRequired?: boolean;
  confirmText?: string;
}

export interface RelatedEntity {
  type: 'invitation' | 'expense' | 'settlement' | 'trip' | 'member';
  id: string;
  additionalData?: any;
}

export interface MessageWithSender extends Message {
  sender?: Pick<User, 'id' | 'username' | 'avatarUrl'> | null;
}

export interface MessageListQuery {
  status?: MessageStatus;
  category?: MessageCategory;
  type?: MessageType;
  priority?: MessagePriority;
  page?: number;
  limit?: number;
}

export interface MessageListResponse {
  messages: MessageWithSender[];
  total: number;
  page: number;
  totalPages: number;
}

export interface UnreadStats {
  total: number;
  byCategory: Record<MessageCategory, number>;
  byPriority: {
    high: number;
    normal: number;
    low: number;
  };
}

export interface MessagePreferenceDTO {
  messageType: MessageType;
  channels: ('inApp' | 'email' | 'push')[];
  enabled: boolean;
  frequency: NotificationFrequency;
}

export interface MessageTemplateData {
  [key: string]: string | number | boolean | Date;
}

export interface SendMessageOptions {
  recipientId: string;
  type: MessageType;
  templateData: MessageTemplateData;
  metadata?: any;
  priority?: MessagePriority;
  expiresIn?: number; // 过期时间（小时）
}

export interface BatchMessageOperation {
  messageIds: string[];
  operation: 'read' | 'archive' | 'delete';
}