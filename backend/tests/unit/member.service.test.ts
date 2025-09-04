import { PrismaClient } from '@prisma/client'
import { MemberService } from '../../src/services/member.service'

const prisma = new PrismaClient()

describe('MemberService - 成员数据访问层', () => {
  let memberService: MemberService
  let testUserId: string
  let testTripId: string
  let testMemberId: string
  let virtualMemberId: string

  beforeAll(async () => {
    // 清理测试数据
    await prisma.expense.deleteMany()
    await prisma.tripMember.deleteMany()
    await prisma.trip.deleteMany()
    await prisma.user.deleteMany()

    // 创建测试数据
    const testUser = await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashedpassword'
      }
    })
    testUserId = testUser.id

    const testTrip = await prisma.trip.create({
      data: {
        name: '测试行程',
        description: '单元测试用',
        startDate: new Date(),
        currency: 'CNY',
        createdBy: testUserId
      }
    })
    testTripId = testTrip.id

    const testMember = await prisma.tripMember.create({
      data: {
        tripId: testTripId,
        userId: testUserId,
        role: 'admin'
      }
    })
    testMemberId = testMember.id

    // 创建虚拟成员
    const virtualMember = await prisma.tripMember.create({
      data: {
        tripId: testTripId,
        userId: null,
        displayName: '虚拟成员',
        isVirtual: true,
        role: 'member'
      }
    })
    virtualMemberId = virtualMember.id

    memberService = new MemberService()
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.expense.deleteMany()
    await prisma.tripMember.deleteMany()
    await prisma.trip.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  describe('getMemberIdByUserId', () => {
    it('应该正确获取memberId', async () => {
      const memberId = await memberService.getMemberIdByUserId(testUserId, testTripId)
      expect(memberId).toBe(testMemberId)
    })

    it('应该在用户不存在时返回null', async () => {
      const memberId = await memberService.getMemberIdByUserId('invalid-user-id', testTripId)
      expect(memberId).toBeNull()
    })

    it('应该在行程不存在时返回null', async () => {
      const memberId = await memberService.getMemberIdByUserId(testUserId, 'invalid-trip-id')
      expect(memberId).toBeNull()
    })
  })

  describe('getMemberById', () => {
    it('应该获取成员详细信息', async () => {
      const member = await memberService.getMemberById(testMemberId)
      
      expect(member).toBeDefined()
      expect(member?.id).toBe(testMemberId)
      expect(member?.userId).toBe(testUserId)
      expect(member?.tripId).toBe(testTripId)
      expect(member?.role).toBe('admin')
      expect(member?.user).toBeDefined()
      expect(member?.trip).toBeDefined()
    })

    it('应该获取虚拟成员信息', async () => {
      const member = await memberService.getMemberById(virtualMemberId)
      
      expect(member).toBeDefined()
      expect(member?.id).toBe(virtualMemberId)
      expect(member?.userId).toBeNull()
      expect(member?.isVirtual).toBe(true)
      expect(member?.displayName).toBe('虚拟成员')
    })

    it('应该在成员不存在时返回null', async () => {
      const member = await memberService.getMemberById('invalid-member-id')
      expect(member).toBeNull()
    })
  })

  describe('checkAndGetMember', () => {
    it('应该验证并返回活跃成员', async () => {
      const member = await memberService.checkAndGetMember(testTripId, testUserId)
      
      expect(member).toBeDefined()
      expect(member.id).toBe(testMemberId)
      expect(member.isActive).toBe(true)
    })

    it('应该在成员不存在时抛出错误', async () => {
      await expect(
        memberService.checkAndGetMember(testTripId, 'invalid-user-id')
      ).rejects.toThrow('用户不是该行程的成员')
    })

    it('应该在成员非活跃时抛出错误', async () => {
      // 先创建一个非活跃成员
      const inactiveUser = await prisma.user.create({
        data: {
          username: 'inactive',
          email: 'inactive@example.com',
          passwordHash: 'hashedpassword'
        }
      })

      await prisma.tripMember.create({
        data: {
          tripId: testTripId,
          userId: inactiveUser.id,
          role: 'member',
          isActive: false
        }
      })

      await expect(
        memberService.checkAndGetMember(testTripId, inactiveUser.id)
      ).rejects.toThrow('用户不是该行程的成员')
    })
  })

  describe('getTripMembers', () => {
    it('应该获取行程的所有活跃成员', async () => {
      const members = await memberService.getTripMembers(testTripId)
      
      expect(members.length).toBeGreaterThanOrEqual(2) // 至少有真实成员和虚拟成员
      
      const realMember = members.find(m => m.id === testMemberId)
      expect(realMember).toBeDefined()
      expect(realMember?.userId).toBe(testUserId)
      
      const virtualMember = members.find(m => m.id === virtualMemberId)
      expect(virtualMember).toBeDefined()
      expect(virtualMember?.isVirtual).toBe(true)
    })

    it('应该不包含非活跃成员', async () => {
      const members = await memberService.getTripMembers(testTripId)
      const inactiveMembers = members.filter(m => !m.isActive)
      expect(inactiveMembers.length).toBe(0)
    })
  })

  describe('getUserIdToMemberIdMap', () => {
    it('应该返回userId到memberId的映射', async () => {
      const map = await memberService.getUserIdToMemberIdMap(testTripId, [testUserId])
      
      expect(map.size).toBe(1)
      expect(map.get(testUserId)).toBe(testMemberId)
    })

    it('应该忽略虚拟成员', async () => {
      const members = await memberService.getTripMembers(testTripId)
      const userIds = members.map(m => m.userId).filter(id => id !== null) as string[]
      
      const map = await memberService.getUserIdToMemberIdMap(testTripId, userIds)
      
      // map中不应包含虚拟成员（userId为null）
      expect(map.size).toBe(userIds.length)
    })

    it('应该处理空数组', async () => {
      const map = await memberService.getUserIdToMemberIdMap(testTripId, [])
      expect(map.size).toBe(0)
    })
  })

  describe('isValidMember', () => {
    it('应该验证有效成员', async () => {
      const isValid = await memberService.isValidMember(testTripId, testMemberId)
      expect(isValid).toBe(true)
    })

    it('应该验证虚拟成员', async () => {
      const isValid = await memberService.isValidMember(testTripId, virtualMemberId)
      expect(isValid).toBe(true)
    })

    it('应该拒绝无效的memberId', async () => {
      const isValid = await memberService.isValidMember(testTripId, 'invalid-member-id')
      expect(isValid).toBe(false)
    })

    it('应该拒绝其他行程的成员', async () => {
      // 创建另一个行程和成员
      const otherTrip = await prisma.trip.create({
        data: {
          name: '其他行程',
          description: '测试用',
          startDate: new Date(),
          createdBy: testUserId
        }
      })

      const otherMember = await prisma.tripMember.create({
        data: {
          tripId: otherTrip.id,
          userId: testUserId,
          role: 'member'
        }
      })

      const isValid = await memberService.isValidMember(testTripId, otherMember.id)
      expect(isValid).toBe(false)
    })
  })

  describe('getMemberRole', () => {
    it('应该返回成员角色', async () => {
      const role = await memberService.getMemberRole(testMemberId)
      expect(role).toBe('admin')
    })

    it('应该返回虚拟成员角色', async () => {
      const role = await memberService.getMemberRole(virtualMemberId)
      expect(role).toBe('member')
    })

    it('应该在成员不存在时返回null', async () => {
      const role = await memberService.getMemberRole('invalid-member-id')
      expect(role).toBeNull()
    })
  })

  describe('getUserMemberships', () => {
    it('应该获取用户的所有行程成员身份', async () => {
      // 创建第二个行程
      const secondTrip = await prisma.trip.create({
        data: {
          name: '第二个行程',
          description: '测试多行程',
          startDate: new Date(),
          createdBy: testUserId
        }
      })

      await prisma.tripMember.create({
        data: {
          tripId: secondTrip.id,
          userId: testUserId,
          role: 'admin'
        }
      })

      const memberships = await memberService.getUserMemberships(testUserId)
      
      expect(memberships.length).toBeGreaterThanOrEqual(2)
      expect(memberships.every(m => m.userId === testUserId)).toBe(true)
      expect(memberships.every(m => m.isActive)).toBe(true)
      expect(memberships.every(m => m.trip !== null)).toBe(true)
    })

    it('应该返回空数组对于没有行程的用户', async () => {
      const newUser = await prisma.user.create({
        data: {
          username: 'newuser',
          email: 'new@example.com',
          passwordHash: 'hashedpassword'
        }
      })

      const memberships = await memberService.getUserMemberships(newUser.id)
      expect(memberships).toEqual([])
    })
  })
})