import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { messageService } from '../services/message.service';
import { sendSuccess, sendError } from '../utils/response';
import { MessageStatus, MessageCategory, MessageType, MessagePriority } from '@prisma/client';

export class MessageController {
  /**
   * 获取消息列表
   * GET /api/messages
   */
  async getMessages(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { status, category, type, priority, page = 1, limit = 20 } = req.query;

      const query = {
        status: status as MessageStatus | undefined,
        category: category as MessageCategory | undefined,
        type: type as MessageType | undefined,
        priority: priority as MessagePriority | undefined,
        page: Number(page),
        limit: Number(limit),
      };

      const result = await messageService.getMessages(userId, query);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, '500', error.message || '获取消息列表失败', 500);
    }
  }

  /**
   * 获取消息详情
   * GET /api/messages/:id
   */
  async getMessageDetail(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.userId!;

      const message = await messageService.getMessageById(id, userId);
      sendSuccess(res, message);
    } catch (error: any) {
      if (error.message === '消息不存在') {
        sendError(res, '404', error.message, 404);
      } else if (error.message === '无权查看此消息') {
        sendError(res, '403', error.message, 403);
      } else {
        sendError(res, '500', error.message || '获取消息详情失败', 500);
      }
    }
  }

  /**
   * 标记消息为已读
   * PUT /api/messages/:id/read
   */
  async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.userId!;

      const message = await messageService.markAsRead(id, userId);
      sendSuccess(res, message);
    } catch (error: any) {
      if (error.message === '消息不存在') {
        sendError(res, '404', error.message, 404);
      } else if (error.message === '无权操作此消息') {
        sendError(res, '403', error.message, 403);
      } else {
        sendError(res, '500', error.message || '标记已读失败', 500);
      }
    }
  }

  /**
   * 批量标记已读
   * PUT /api/messages/batch-read
   */
  async batchMarkAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { messageIds } = req.body;

      if (!Array.isArray(messageIds) || messageIds.length === 0) {
        sendError(res, '400', '消息ID列表不能为空', 400);
        return;
      }

      const result = await messageService.batchMarkAsRead(messageIds, userId);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, '500', error.message || '批量标记已读失败', 500);
    }
  }

  /**
   * 标记所有消息为已读
   * PUT /api/messages/mark-all-read
   */
  async markAllAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const result = await messageService.markAllAsRead(userId);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, '500', error.message || '标记所有消息已读失败', 500);
    }
  }

  /**
   * 归档消息
   * PUT /api/messages/:id/archive
   */
  async archiveMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.userId!;

      const message = await messageService.archiveMessage(id, userId);
      sendSuccess(res, message);
    } catch (error: any) {
      if (error.message === '消息不存在') {
        sendError(res, '404', error.message, 404);
      } else if (error.message === '无权操作此消息') {
        sendError(res, '403', error.message, 403);
      } else {
        sendError(res, '500', error.message || '归档消息失败', 500);
      }
    }
  }

  /**
   * 删除消息
   * DELETE /api/messages/:id
   */
  async deleteMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.userId!;

      const message = await messageService.deleteMessage(id, userId);
      sendSuccess(res, message);
    } catch (error: any) {
      if (error.message === '消息不存在') {
        sendError(res, '404', error.message, 404);
      } else if (error.message === '无权操作此消息') {
        sendError(res, '403', error.message, 403);
      } else {
        sendError(res, '500', error.message || '删除消息失败', 500);
      }
    }
  }

  /**
   * 批量操作
   * POST /api/messages/batch-operation
   */
  async batchOperation(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { messageIds, operation } = req.body;

      if (!Array.isArray(messageIds) || messageIds.length === 0) {
        sendError(res, '400', '消息ID列表不能为空', 400);
        return;
      }

      if (!['read', 'archive', 'delete'].includes(operation)) {
        sendError(res, '400', '不支持的操作类型', 400);
        return;
      }

      const result = await messageService.batchOperation(
        { messageIds, operation },
        userId
      );
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, '500', error.message || '批量操作失败', 500);
    }
  }

  /**
   * 获取未读消息统计
   * GET /api/messages/unread-stats
   */
  async getUnreadStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const stats = await messageService.getUnreadStats(userId);
      sendSuccess(res, stats);
    } catch (error: any) {
      sendError(res, '500', error.message || '获取未读统计失败', 500);
    }
  }

  /**
   * 获取消息偏好设置
   * GET /api/message-preferences
   */
  async getPreferences(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const preferences = await messageService.getUserPreferences(userId);
      sendSuccess(res, preferences);
    } catch (error: any) {
      sendError(res, '500', error.message || '获取消息偏好设置失败', 500);
    }
  }

  /**
   * 更新消息偏好设置
   * PUT /api/message-preferences
   */
  async updatePreferences(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { preferences } = req.body;

      if (!Array.isArray(preferences)) {
        sendError(res, '400', '偏好设置必须是数组', 400);
        return;
      }

      const result = await messageService.updateUserPreferences(userId, preferences);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, '500', error.message || '更新消息偏好设置失败', 500);
    }
  }
}

export const messageController = new MessageController();