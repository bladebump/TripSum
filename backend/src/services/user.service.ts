import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class UserService {
  /**
   * 搜索用户
   * @param query 搜索关键词（用户名或邮箱）
   * @param excludeTripId 排除已在该行程中的用户
   * @param limit 返回结果数量限制
   */
  async searchUsers(query: string, excludeTripId?: string, limit: number = 10) {
    // 构建基础查询条件
    const whereCondition: any = {
      OR: [
        { username: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    };

    // 如果指定了行程ID，排除已在该行程中的用户
    if (excludeTripId) {
      const tripMembers = await prisma.tripMember.findMany({
        where: {
          tripId: excludeTripId,
          userId: { not: null },
          isActive: true,
        },
        select: { userId: true },
      });

      const memberUserIds = tripMembers
        .map(m => m.userId)
        .filter((id): id is string => id !== null);

      if (memberUserIds.length > 0) {
        whereCondition.id = { notIn: memberUserIds };
      }
    }

    // 执行搜索
    const users = await prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
      },
      take: limit,
      orderBy: { username: 'asc' },
    });

    return users;
  }

  /**
   * 获取用户基本信息
   * @param userId 用户ID
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    return user;
  }

  /**
   * 批量获取用户信息
   * @param userIds 用户ID数组
   */
  async getUsersByIds(userIds: string[]) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
      },
    });

    return users;
  }

  /**
   * 检查用户是否存在
   * @param userId 用户ID
   */
  async checkUserExists(userId: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: { id: userId },
    });

    return count > 0;
  }

  /**
   * 获取用户的行程列表（用于验证权限）
   * @param userId 用户ID
   */
  async getUserTrips(userId: string) {
    const trips = await prisma.tripMember.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        trip: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return trips.map(tm => ({
      tripId: tm.tripId,
      tripName: tm.trip.name,
      role: tm.role,
      joinDate: tm.joinDate,
    }));
  }
}

export const userService = new UserService();