import { PrismaClient, User } from '@prisma/client'
import bcrypt from 'bcrypt'

export class UserFactory {
  constructor(private prisma: PrismaClient) {}

  async create(overrides: Partial<User> = {}): Promise<User> {
    const timestamp = Date.now()
    const defaultData = {
      username: `test_user_${timestamp}`,
      email: `test_${timestamp}@example.com`,
      passwordHash: await bcrypt.hash('Test@123456', 10),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    return this.prisma.user.create({
      data: { ...defaultData, ...overrides } as any
    })
  }

  async createMany(count: number, overrides: Partial<User> = {}): Promise<User[]> {
    const users: User[] = []
    for (let i = 0; i < count; i++) {
      const user = await this.create({
        ...overrides,
        username: `test_user_${i}_${Date.now()}`,
        email: `test_${i}_${Date.now()}@example.com`,
      })
      users.push(user)
    }
    return users
  }

  async createWithTrip(tripName?: string) {
    const user = await this.create()
    const trip = await this.prisma.trip.create({
      data: {
        name: tripName || `Test Trip ${Date.now()}`,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
        currency: 'CNY',
        creator: {
          connect: { id: user.id }
        },
        members: {
          create: {
            userId: user.id,
            displayName: user.username,
            role: 'admin',
            isVirtual: false,
          }
        }
      },
      include: {
        members: true
      }
    })

    return { user, trip }
  }

  async cleanup() {
    // 获取所有测试用户
    const testUsers = await this.prisma.user.findMany({
      where: {
        email: {
          contains: 'test_'
        }
      },
      select: { id: true }
    })

    const userIds = testUsers.map(user => user.id)

    if (userIds.length === 0) return

    // 按顺序删除相关数据，避免外键约束冲突
    try {
      // 1. 删除消息偏好
      await this.prisma.messagePreference.deleteMany({
        where: { userId: { in: userIds } }
      })

      // 2. 删除消息（作为接收者和发送者）
      await this.prisma.message.deleteMany({
        where: { 
          OR: [
            { recipientId: { in: userIds } },
            { senderId: { in: userIds } }
          ]
        }
      })

      // 3. 删除邀请（作为邀请者和被邀请者）
      await this.prisma.tripInvitation.deleteMany({
        where: { 
          OR: [
            { createdBy: { in: userIds } },
            { invitedUserId: { in: userIds } }
          ]
        }
      })

      // 4. 删除费用参与者记录
      const expenseParticipants = await this.prisma.expenseParticipant.findMany({
        where: {
          tripMember: {
            userId: { in: userIds }
          }
        }
      })
      const participantIds = expenseParticipants.map(p => p.id)
      if (participantIds.length > 0) {
        await this.prisma.expenseParticipant.deleteMany({
          where: { id: { in: participantIds } }
        })
      }

      // 5. 删除费用记录
      await this.prisma.expense.deleteMany({
        where: { createdBy: { in: userIds } }
      })

      // 6. 删除行程成员关系
      await this.prisma.tripMember.deleteMany({
        where: { userId: { in: userIds } }
      })

      // 7. 删除行程
      await this.prisma.trip.deleteMany({
        where: { createdBy: { in: userIds } }
      })

      // 8. 最后删除用户
      await this.prisma.user.deleteMany({
        where: { id: { in: userIds } }
      })
    } catch (error) {
      console.warn('Failed to cleanup test users:', error)
    }
  }
}