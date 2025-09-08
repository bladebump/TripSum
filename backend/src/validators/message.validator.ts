import Joi from 'joi';
import { 
  MessageStatus, 
  MessageCategory, 
  MessageType, 
  MessagePriority, 
  NotificationFrequency 
} from '@prisma/client';

export const messageListQuerySchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(MessageStatus))
    .optional(),
  category: Joi.string()
    .valid(...Object.values(MessageCategory))
    .optional(),
  type: Joi.string()
    .valid(...Object.values(MessageType))
    .optional(),
  priority: Joi.string()
    .valid(...Object.values(MessagePriority))
    .optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const batchMessageIdsSchema = Joi.object({
  messageIds: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .max(100)
    .required(),
});

export const batchOperationSchema = Joi.object({
  messageIds: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .max(100)
    .required(),
  operation: Joi.string()
    .valid('read', 'archive', 'delete')
    .required(),
});

export const messagePreferencesSchema = Joi.object({
  preferences: Joi.array()
    .items(
      Joi.object({
        messageType: Joi.string()
          .valid(...Object.values(MessageType))
          .required(),
        channels: Joi.array()
          .items(Joi.string().valid('inApp', 'email', 'push'))
          .min(1)
          .required(),
        enabled: Joi.boolean().required(),
        frequency: Joi.string()
          .valid(...Object.values(NotificationFrequency))
          .required(),
      })
    )
    .min(1)
    .required(),
});