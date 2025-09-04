import { PrismaClient } from '@prisma/client'
import { MemberService } from '../../src/services/member.service'
import { ExpenseService } from '../../src/services/expense.service'
import { TripService } from '../../src/services/trip.service'

const prisma = new PrismaClient()

describe('userId到memberId端到端转换测试', () => {
  let memberService: MemberService
  let expenseService: ExpenseService
  let tripService: TripService
  
  let adminUserId: string
  let memberUserId: string
  let tripId: string
  let adminMemberId: string
  let regularMemberId: string
  let virtualMemberId: string

  beforeAll(async () => {
    // 清理测试数据
    await prisma.expense.deleteMany()
    await prisma.tripMember.deleteMany()
    await prisma.trip.deleteMany()
    await prisma.user.deleteMany()

    // 初始化服务
    memberService = new MemberService()
    expenseService = new ExpenseService()
    tripService = new TripService()

    // 创建测试用户
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin_user',
        email: 'admin@test.com',
        passwordHash: 'hashedpassword'
      }
    })
    adminUserId = adminUser.id

    const regularUser = await prisma.user.create({
      data: {
        username: 'regular_user',
        email: 'regular@test.com',
        passwordHash: 'hashedpassword'
      }
    })
    memberUserId = regularUser.id

    // 创建行程
    const trip = await prisma.trip.create({
      data: {
        name: '端到端测试行程',
        description: 'userId到memberId转换测试',
        startDate: new Date(),
        currency: 'CNY',
        initialFund: 2000,
        createdBy: adminUserId
      }
    })
    tripId = trip.id

    // 创建成员
    const adminMember = await prisma.tripMember.create({
      data: {
        tripId,
        userId: adminUserId,
        role: 'admin',
        contribution: 1000
      }
    })
    adminMemberId = adminMember.id

    const regularMember = await prisma.tripMember.create({
      data: {
        tripId,
        userId: memberUserId,
        role: 'member',
        contribution: 500
      }
    })
    regularMemberId = regularMember.id

    const virtualMember = await prisma.tripMember.create({
      data: {
        tripId,
        userId: null,
        displayName: '虚拟测试成员',
        isVirtual: true,
        role: 'member',
        contribution: 0
      }
    })
    virtualMemberId = virtualMember.id
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.expense.deleteMany()
    await prisma.tripMember.deleteMany()
    await prisma.trip.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  describe('认证层使用userId', () => {
    it('应该通过userId验证用户权限', async () => {
      // 通过获取行程详情来验证权限
      const tripDetail = await tripService.getTripDetail(tripId, adminUserId)
      expect(tripDetail).toBeDefined()
      expect(tripDetail.id).toBe(tripId)
    })

    it('应该通过userId获取用户的所有行程', async () => {
      const trips = await tripService.getUserTrips(adminUserId, 1, 10)
      expect(trips.trips).toBeDefined()
      expect(trips.trips.length).toBeGreaterThan(0)
      expect(trips.trips[0].id).toBe(tripId)
    })

    it('应该拒绝无权限的用户访问', async () => {
      const unauthorizedUser = await prisma.user.create({
        data: {
          username: 'unauthorized',
          email: 'unauthorized@test.com',
          passwordHash: 'hashedpassword'
        }
      })

      await expect(
        tripService.getTripDetail(tripId, unauthorizedUser.id)
      ).rejects.toThrow()
    })
  })

  describe('业务层使用memberId', () => {
    it('应该使用memberId创建支出', async () => {
      const expenseData = {
        amount: 600,
        description: '测试支出',
        expenseDate: new Date(),
        payerId: adminMemberId, // 使用memberId
        participants: [
          { memberId: adminMemberId, shareAmount: 200 },
          { memberId: regularMemberId, shareAmount: 200 },
          { memberId: virtualMemberId, shareAmount: 200 }
        ]
      }

      const expense = await expenseService.createExpense(
        tripId,
        adminUserId, // 认证层仍使用userId
        expenseData
      )

      expect(expense).toBeDefined()
      expect(expense.payerMemberId).toBe(adminMemberId)
      expect(expense.amount).toBe(600)

      // 验证参与者
      const participants = await prisma.expenseParticipant.findMany({
        where: { expenseId: expense.id }
      })
      expect(participants.length).toBe(3)
      expect(participants.every(p => p.tripMemberId)).toBe(true)
    })

    it('应该使用memberId更新成员角色', async () => {
      const updatedMember = await tripService.updateMemberRoleById(
        tripId,
        regularMemberId, // 使用memberId
        'admin',
        adminUserId // 操作者仍使用userId进行权限验证
      )

      expect(updatedMember.role).toBe('admin')
      
      // 恢复原角色
      await tripService.updateMemberRoleById(
        tripId,
        regularMemberId,
        'member',
        adminUserId
      )
    })

    it('应该使用memberId更新成员基金缴纳', async () => {
      const updatedMember = await tripService.updateMemberContribution(
        tripId,
        regularMemberId, // 使用memberId
        800,
        adminUserId // 操作者userId
      )

      expect(Number(updatedMember.contribution)).toBe(800)
    })
  })

  describe('数据转换功能', () => {
    it('应该正确转换userId到memberId', async () => {
      const memberId = await memberService.getMemberIdByUserId(adminUserId, tripId)
      expect(memberId).toBe(adminMemberId)
    })

    it('应该批量转换userId到memberId', async () => {
      const userIds = [adminUserId, memberUserId]
      const map = await memberService.getUserIdToMemberIdMap(tripId, userIds)
      
      expect(map.size).toBe(2)
      expect(map.get(adminUserId)).toBe(adminMemberId)
      expect(map.get(memberUserId)).toBe(regularMemberId)
    })

    it('虚拟成员不应该出现在userId映射中', async () => {
      const allMembers = await memberService.getTripMembers(tripId)
      const userIds = allMembers
        .filter(m => m.userId !== null)
        .map(m => m.userId as string)
      
      const map = await memberService.getUserIdToMemberIdMap(tripId, userIds)
      
      // 虚拟成员没有userId，所以不应该在map中
      expect(Array.from(map.values())).not.toContain(virtualMemberId)
    })
  })

  describe('混合场景测试', () => {
    it('应该在完整业务流程中正确处理userId和memberId', async () => {
      // 1. 用户通过JWT认证（userId）
      const userTrips = await tripService.getUserTrips(memberUserId, 1, 10)
      expect(userTrips.trips.length).toBeGreaterThan(0)

      // 2. 获取用户对应的memberId
      const memberId = await memberService.getMemberIdByUserId(memberUserId, tripId)
      expect(memberId).toBe(regularMemberId)

      // 3. 使用memberId进行业务操作
      const expenseData = {
        amount: 300,
        description: '混合场景测试',
        expenseDate: new Date(),
        payerId: memberId!, // 使用转换后的memberId
        participants: [
          { memberId: adminMemberId, shareAmount: 100 },
          { memberId: regularMemberId, shareAmount: 100 },
          { memberId: virtualMemberId, shareAmount: 100 }
        ]
      }

      const expense = await expenseService.createExpense(
        tripId,
        memberUserId, // 认证层使用userId
        expenseData
      )

      expect(expense).toBeDefined()
      expect(expense.payerMemberId).toBe(regularMemberId)

      // 4. 验证虚拟成员也能正常参与
      const participants = await prisma.expenseParticipant.findMany({
        where: { 
          expenseId: expense.id,
          tripMemberId: virtualMemberId
        }
      })
      expect(participants.length).toBe(1)
      expect(participants[0].shareAmount).toBe(100)
    })

    it('应该处理成员不存在的错误情况', async () => {
      const fakeUserId = 'fake-user-id'
      
      // 转换应该返回null
      const memberId = await memberService.getMemberIdByUserId(fakeUserId, tripId)
      expect(memberId).toBeNull()

      // 权限检查应该失败
      await expect(
        tripService.getTripDetail(tripId, fakeUserId)
      ).rejects.toThrow()
    })
  })
})