import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { sendError } from '../utils/response';

const prisma = new PrismaClient();

// 权限定义
export const PERMISSIONS = {
  // 费用相关权限 - v2.0.0暂时限制非管理员记账
  'expense.create': ['admin'],
  'expense.update': ['admin'],
  'expense.delete': ['admin'],
  'expense.view': ['admin', 'member'],
  
  // 行程相关权限
  'trip.create': ['admin', 'member'],
  'trip.update': ['admin'],
  'trip.delete': ['admin'],
  'trip.export': ['admin', 'member'],
  
  // 成员管理权限
  'member.add': ['admin'],
  'member.remove': ['admin'],
  'member.update': ['admin'],
  'member.view': ['admin', 'member'],
  
  // 邀请权限
  'invitation.send': ['admin'],
  'invitation.cancel': ['admin'],
  'invitation.view': ['admin', 'member'],
  
  // 消息权限
  'message.send': ['admin', 'member'],
  'message.view': ['admin', 'member'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * 检查用户是否有指定权限
 */
export const checkPermission = (permission: Permission) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
      const userId = req.userId;
      const tripId = req.context?.tripId;
      
      if (!userId) {
        return sendError(res, '401', '未授权访问', 401);
      }
      
      if (!tripId) {
        return sendError(res, '400', '缺少行程上下文', 400);
      }
      
      const tripMember = await prisma.tripMember.findFirst({
        where: {
          tripId,
          userId,
          isActive: true,
        },
      });
      
      if (!tripMember) {
        return sendError(res, '403', '您不是该行程的成员', 403);
      }
      
      const allowedRoles = PERMISSIONS[permission];
      if (!allowedRoles.includes(tripMember.role as any)) {
        return sendError(res, '403', '您没有执行此操作的权限', 403);
      }
      
      req.context!.tripMember = tripMember;
      req.context!.tripMemberId = tripMember.id;
      req.context!.memberRole = tripMember.role;
      
      next();
    } catch (error) {
      return sendError(res, '500', '权限检查失败', 500);
    }
  };
};

/**
 * 检查用户是否是行程管理员
 */
export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.userId;
    const tripId = req.context?.tripId;
    
    if (!userId) {
      return sendError(res, '401', '未授权访问', 401);
    }
    
    if (!tripId) {
      return sendError(res, '400', '缺少行程上下文', 400);
    }
    
    const tripMember = await prisma.tripMember.findFirst({
      where: {
        tripId,
        userId,
        isActive: true,
        role: 'admin',
      },
    });
    
    if (!tripMember) {
      return sendError(res, '403', '需要管理员权限', 403);
    }
    
    req.context!.tripMember = tripMember;
    req.context!.tripMemberId = tripMember.id;
    req.context!.memberRole = 'admin';
    
    next();
  } catch (error) {
    return sendError(res, '500', '权限检查失败', 500);
  }
};

/**
 * 检查用户是否是行程成员
 */
export const requireMember = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.userId;
    const tripId = req.context?.tripId;
    
    if (!userId) {
      return sendError(res, '401', '未授权访问', 401);
    }
    
    if (!tripId) {
      return sendError(res, '400', '缺少行程上下文', 400);
    }
    
    const tripMember = await prisma.tripMember.findFirst({
      where: {
        tripId,
        userId,
        isActive: true,
      },
    });
    
    if (!tripMember) {
      return sendError(res, '403', '您不是该行程的成员', 403);
    }
    
    req.context!.tripMember = tripMember;
    req.context!.tripMemberId = tripMember.id;
    req.context!.memberRole = tripMember.role;
    
    next();
  } catch (error) {
    return sendError(res, '500', '权限检查失败', 500);
  }
};