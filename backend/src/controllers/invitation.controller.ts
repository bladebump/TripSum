import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { invitationService } from '../services/invitation.service';
import { sendSuccess, sendError } from '../utils/response';
import { InvitationStatus } from '@prisma/client';

export class InvitationController {
  /**
   * 发送邀请
   * POST /api/trips/:id/invitations
   */
  async sendInvitation(req: AuthenticatedRequest, res: Response) {
    try {
      const tripId = req.params.id;
      const userId = req.userId!;
      
      // 权限已在中间件中验证（requireAdmin）
      const invitation = await invitationService.createInvitation(
        tripId,
        userId,
        req.body
      );

      sendSuccess(res, invitation, 201);
    } catch (error: any) {
      if (error.message.includes('已经是行程成员') || 
          error.message.includes('已有待处理的邀请')) {
        sendError(res, '400', error.message, 400);
      } else {
        sendError(res, '500', error.message || '发送邀请失败', 500);
      }
    }
  }

  /**
   * 获取我的邀请列表
   * GET /api/invitations
   */
  async getMyInvitations(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { status, page = 1, limit = 10 } = req.query;

      const query = {
        status: status as InvitationStatus | undefined,
        page: Number(page),
        limit: Number(limit),
      };

      const result = await invitationService.getUserInvitations(userId, query);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, '500', error.message || '获取邀请列表失败', 500);
    }
  }

  /**
   * 获取邀请详情
   * GET /api/invitations/:id
   */
  async getInvitationDetail(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.userId!;

      const invitation = await invitationService.getInvitationById(id, userId);
      sendSuccess(res, invitation);
    } catch (error: any) {
      if (error.message === '邀请不存在') {
        sendError(res, '404', error.message, 404);
      } else if (error.message === '无权查看此邀请') {
        sendError(res, '403', error.message, 403);
      } else {
        sendError(res, '500', error.message || '获取邀请详情失败', 500);
      }
    }
  }

  /**
   * 接受邀请
   * POST /api/invitations/:id/accept
   */
  async acceptInvitation(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.userId!;

      const result = await invitationService.acceptInvitation(id, userId);
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message.includes('不存在') || error.message.includes('已过期')) {
        sendError(res, '404', error.message, 404);
      } else if (error.message.includes('无权')) {
        sendError(res, '403', error.message, 403);
      } else if (error.message.includes('已经是')) {
        sendError(res, '400', error.message, 400);
      } else {
        sendError(res, '500', error.message || '接受邀请失败', 500);
      }
    }
  }

  /**
   * 拒绝邀请
   * POST /api/invitations/:id/reject
   */
  async rejectInvitation(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.userId!;

      const result = await invitationService.rejectInvitation(id, userId);
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === '邀请不存在') {
        sendError(res, '404', error.message, 404);
      } else if (error.message.includes('无权')) {
        sendError(res, '403', error.message, 403);
      } else {
        sendError(res, '500', error.message || '拒绝邀请失败', 500);
      }
    }
  }

  /**
   * 撤销邀请
   * DELETE /api/invitations/:id
   */
  async cancelInvitation(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.userId!;

      const result = await invitationService.cancelInvitation(id, userId);
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === '邀请不存在') {
        sendError(res, '404', error.message, 404);
      } else if (error.message.includes('无权')) {
        sendError(res, '403', error.message, 403);
      } else {
        sendError(res, '500', error.message || '撤销邀请失败', 500);
      }
    }
  }

  /**
   * 获取行程的邀请列表
   * GET /api/trips/:id/invitations
   */
  async getTripInvitations(req: AuthenticatedRequest, res: Response) {
    try {
      const tripId = req.params.id;
      const { status } = req.query;

      // 权限已在中间件中验证（requireAdmin）
      const invitations = await invitationService.getTripInvitations(
        tripId,
        status as InvitationStatus | undefined
      );

      sendSuccess(res, invitations);
    } catch (error: any) {
      sendError(res, '500', error.message || '获取行程邀请列表失败', 500);
    }
  }
}

export const invitationController = new InvitationController();