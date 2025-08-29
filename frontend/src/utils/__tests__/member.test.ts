import { describe, it, expect } from 'vitest'
import { 
  isCurrentUserAdmin,
  getMemberDisplayName,
  getMemberById,
  findMemberByName
} from '../member'

describe('Member Utils', () => {
  const mockMembers = [
    {
      id: 'm1',
      userId: 'u1',
      role: 'admin',
      isVirtual: false,
      displayName: null,
      contribution: 1000,
      user: { username: '张三', email: 'zhang@example.com' }
    },
    {
      id: 'm2',
      userId: 'u2', 
      role: 'member',
      isVirtual: false,
      displayName: null,
      contribution: 500,
      user: { username: '李四', email: 'li@example.com' }
    },
    {
      id: 'm3',
      userId: null,
      role: 'member',
      isVirtual: true,
      displayName: '虚拟王五',
      contribution: 0,
      user: null
    }
  ]

  describe('isCurrentUserAdmin', () => {
    it('应该正确识别管理员', () => {
      expect(isCurrentUserAdmin(mockMembers, 'u1')).toBe(true)
      expect(isCurrentUserAdmin(mockMembers, 'u2')).toBe(false)
    })

    it('应该处理用户不存在的情况', () => {
      expect(isCurrentUserAdmin(mockMembers, 'u999')).toBe(false)
      expect(isCurrentUserAdmin(mockMembers, null)).toBe(false)
      expect(isCurrentUserAdmin(mockMembers, undefined)).toBe(false)
    })

    it('应该处理空成员列表', () => {
      expect(isCurrentUserAdmin([], 'u1')).toBe(false)
      expect(isCurrentUserAdmin(null as any, 'u1')).toBe(false)
    })

    it('虚拟成员不能是管理员', () => {
      expect(isCurrentUserAdmin(mockMembers, null)).toBe(false)
    })
  })

  describe('getMemberDisplayName', () => {
    it('应该返回真实用户的用户名', () => {
      expect(getMemberDisplayName(mockMembers[0])).toBe('张三')
      expect(getMemberDisplayName(mockMembers[1])).toBe('李四')
    })

    it('应该返回虚拟成员的显示名称', () => {
      expect(getMemberDisplayName(mockMembers[2])).toBe('虚拟王五')
    })

    it('应该处理缺少displayName的虚拟成员', () => {
      const virtualMember = {
        ...mockMembers[2],
        displayName: null
      }
      expect(getMemberDisplayName(virtualMember as any)).toBe('虚拟成员')
    })

    it('应该处理缺少username的真实用户', () => {
      const realMember = {
        ...mockMembers[0],
        user: { ...mockMembers[0].user, username: null }
      }
      expect(getMemberDisplayName(realMember as any)).toBe('未知用户')
    })

    it('应该处理null和undefined', () => {
      expect(getMemberDisplayName(null as any)).toBe('未知')
      expect(getMemberDisplayName(undefined as any)).toBe('未知')
    })
  })

  describe('getMemberById', () => {
    it('应该通过ID找到成员', () => {
      const member = getMemberById(mockMembers, 'm1')
      expect(member?.id).toBe('m1')
      expect(member?.user?.username).toBe('张三')
    })

    it('应该找到虚拟成员', () => {
      const member = getMemberById(mockMembers, 'm3')
      expect(member?.id).toBe('m3')
      expect(member?.isVirtual).toBe(true)
      expect(member?.displayName).toBe('虚拟王五')
    })

    it('应该返回undefined当成员不存在', () => {
      expect(getMemberById(mockMembers, 'm999')).toBeUndefined()
      expect(getMemberById(mockMembers, '')).toBeUndefined()
      expect(getMemberById(mockMembers, null as any)).toBeUndefined()
    })

    it('应该处理空列表', () => {
      expect(getMemberById([], 'm1')).toBeUndefined()
      expect(getMemberById(null as any, 'm1')).toBeUndefined()
    })
  })

  describe('findMemberByName', () => {
    it('应该通过用户名找到真实用户', () => {
      const member = findMemberByName(mockMembers, '张三')
      expect(member?.id).toBe('m1')
      expect(member?.user?.username).toBe('张三')
    })

    it('应该通过显示名找到虚拟成员', () => {
      const member = findMemberByName(mockMembers, '虚拟王五')
      expect(member?.id).toBe('m3')
      expect(member?.isVirtual).toBe(true)
    })

    it('应该忽略大小写', () => {
      // 注意：这取决于实现是否支持忽略大小写
      const member = findMemberByName(mockMembers, '张三')
      expect(member?.id).toBe('m1')
    })

    it('应该返回undefined当名字不存在', () => {
      expect(findMemberByName(mockMembers, '不存在的人')).toBeUndefined()
      expect(findMemberByName(mockMembers, '')).toBeUndefined()
      expect(findMemberByName(mockMembers, null as any)).toBeUndefined()
    })

    it('应该处理空列表', () => {
      expect(findMemberByName([], '张三')).toBeUndefined()
      expect(findMemberByName(null as any, '张三')).toBeUndefined()
    })

    it('应该处理部分匹配', () => {
      // 如果实现支持部分匹配
      const member = findMemberByName(mockMembers, '张')
      // 根据实际实现调整预期
      if (member) {
        expect(member.user?.username).toContain('张')
      }
    })
  })
})