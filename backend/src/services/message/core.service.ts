import { messageCrudService } from './crud.service'
import { messageQueryService } from './query.service'
import { messageBatchService } from './batch.service'
import { messagePreferenceService } from './preference.service'
import { messageTemplateService } from './template.service'

export class MessageService {
  // CRUD service delegation
  createMessage = messageCrudService.createMessage.bind(messageCrudService)
  getMessageById = messageCrudService.getMessageById.bind(messageCrudService)
  markAsRead = messageCrudService.markAsRead.bind(messageCrudService)
  archiveMessage = messageCrudService.archiveMessage.bind(messageCrudService)
  deleteMessage = messageCrudService.deleteMessage.bind(messageCrudService)
  cleanupExpiredMessages = messageCrudService.cleanupExpiredMessages.bind(messageCrudService)
  
  // Query service delegation
  getMessages = messageQueryService.getMessages.bind(messageQueryService)
  getUnreadStats = messageQueryService.getUnreadStats.bind(messageQueryService)
  getUnreadCount = messageQueryService.getUnreadCount.bind(messageQueryService)
  getRecentMessages = messageQueryService.getRecentMessages.bind(messageQueryService)
  
  // Batch service delegation
  batchMarkAsRead = messageBatchService.batchMarkAsRead.bind(messageBatchService)
  markAllAsRead = messageBatchService.markAllAsRead.bind(messageBatchService)
  batchOperation = messageBatchService.batchOperation.bind(messageBatchService)
  batchArchive = messageBatchService.batchArchive.bind(messageBatchService)
  batchDelete = messageBatchService.batchDelete.bind(messageBatchService)
  
  // Preference service delegation
  getUserPreferences = messagePreferenceService.getUserPreferences.bind(messagePreferenceService)
  updateUserPreferences = messagePreferenceService.updateUserPreferences.bind(messagePreferenceService)
  checkUserPreference = messagePreferenceService.checkUserPreference.bind(messagePreferenceService)
  getPreferenceChannels = messagePreferenceService.getPreferenceChannels.bind(messagePreferenceService)
  
  // Template service delegation
  createMessageFromTemplate = messageTemplateService.createMessageFromTemplate.bind(messageTemplateService)
  getTemplateByType = messageTemplateService.getTemplateByType.bind(messageTemplateService)
  createTemplate = messageTemplateService.createTemplate.bind(messageTemplateService)
  updateTemplate = messageTemplateService.updateTemplate.bind(messageTemplateService)
}

export const messageService = new MessageService()