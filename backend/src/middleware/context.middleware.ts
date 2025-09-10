import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { sendError } from '../utils/response';

const prisma = new PrismaClient();

/**
 * 设置行程上下文中间件
 * 统一处理tripId的提取和验证，为后续中间件提供标准化的上下文
 */
export const setupTripContext = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    // 从URL参数中获取tripId
    const tripId = req.params.tripId;
    
    // 如果没有tripId，说明不是行程相关的路由，直接通过
    if (!tripId) {
      return next();
    }
    
    // 验证trip是否存在
    const trip = await prisma.trip.findUnique({
      where: { id: tripId }
    });
    
    if (!trip) {
      return sendError(res, '404', '行程不存在', 404);
    }
    
    // 设置统一的请求上下文
    req.context = {
      tripId: trip.id,
      trip: trip,
      // 预留空间，后续中间件可以添加更多信息
      tripMember: null,
      tripMemberId: null,
      memberRole: null
    };
    
    next();
  } catch (error) {
    console.error('Setup trip context error:', error);
    return sendError(res, '500', '设置请求上下文失败', 500);
  }
};

/**
 * 设置费用上下文中间件
 * 用于费用相关的路由，提取费用信息
 */
export const setupExpenseContext = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const expenseId = req.params.expenseId;
    
    if (!expenseId) {
      return next();
    }
    
    // 验证费用是否存在
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId }
    });
    
    if (!expense) {
      return sendError(res, '404', '费用不存在', 404);
    }
    
    // 验证费用是否属于当前行程
    if (req.context?.tripId && expense.tripId !== req.context.tripId) {
      return sendError(res, '403', '费用不属于该行程', 403);
    }
    
    // 添加费用信息到上下文
    if (req.context) {
      req.context.expense = expense;
      req.context.expenseId = expense.id;
    }
    
    next();
  } catch (error) {
    console.error('Setup expense context error:', error);
    return sendError(res, '500', '设置费用上下文失败', 500);
  }
};