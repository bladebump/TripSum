import { 
  Message, 
  MessageType, 
  MessageCategory, 
  MessagePriority, 
  MessageStatus,
  User 
} from '@prisma/client';

export interface CreateMessageDTO {
  recipientId: string;
  senderId?: string;
  type: string;
  category?: string;
  priority?: string;
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
  byCategory: Record<string, number>;
  byPriority: {
    HIGH: number;
    NORMAL: number;
    LOW: number;
  };
  hasHighPriority: boolean;
}

export interface MessagePreferenceDTO {
  type: string;
  channels: string[];
  enabled: boolean;
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
  action: 'read' | 'archive' | 'delete';
  messageIds?: string[];
  filters?: {
    category?: MessageCategory;
    type?: MessageType;
    status?: MessageStatus;
  };
}