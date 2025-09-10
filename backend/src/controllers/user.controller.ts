import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { userService } from '../services/user.service';
import { sendSuccess, sendError } from '../utils/response';

export class UserController {
  /**
   * 搜索用户
   * GET /api/users/search
   */
  async searchUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const { keyword, tripId, limit = 10 } = req.query;

      if (!keyword || typeof keyword !== 'string') {
        sendError(res, '400', '搜索关键词不能为空', 400);
        return;
      }

      if (keyword.length < 1) {
        sendError(res, '400', '搜索关键词不能为空', 400);
        return;
      }

      const users = await userService.searchUsers(
        keyword,
        tripId as string | undefined,
        Number(limit)
      );

      sendSuccess(res, users);
    } catch (error: any) {
      sendError(res, '500', error.message || '搜索用户失败', 500);
    }
  }

  /**
   * 获取用户详情
   * GET /api/users/:id
   */
  async getUserById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);
      sendSuccess(res, user);
    } catch (error: any) {
      if (error.message === '用户不存在') {
        sendError(res, '404', error.message, 404);
      } else {
        sendError(res, '500', error.message || '获取用户信息失败', 500);
      }
    }
  }

  /**
   * 获取当前用户的行程列表
   * GET /api/users/me/trips
   */
  async getMyTrips(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const trips = await userService.getUserTrips(userId);
      sendSuccess(res, trips);
    } catch (error: any) {
      sendError(res, '500', error.message || '获取行程列表失败', 500);
    }
  }
}

export const userController = new UserController();