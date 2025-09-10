import { Router } from 'express';
import { messageController } from '../controllers/message.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate, validateQuery } from '../middleware/validation.middleware';
import {
  messageListQuerySchema,
  batchMessageIdsSchema,
  batchOperationSchema,
} from '../validators/message.validator';

const router = Router();

// 所有消息相关路由都需要认证
router.use(authenticate);

// 消息列表和统计
router.get('/', validateQuery(messageListQuerySchema), messageController.getMessages);
router.get('/unread-stats', messageController.getUnreadStats);

// 批量操作
router.put('/batch-read', validate(batchMessageIdsSchema), messageController.batchMarkAsRead);
router.put('/mark-all-read', messageController.markAllAsRead);
router.post('/batch-operation', validate(batchOperationSchema), messageController.batchOperation);

// 单个消息操作
router.get('/:id', messageController.getMessageDetail);
router.put('/:id/read', messageController.markAsRead);
router.put('/:id/archive', messageController.archiveMessage);
router.delete('/:id', messageController.deleteMessage);

export default router;