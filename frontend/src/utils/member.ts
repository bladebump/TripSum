import type { TripMember } from '@/types'

/**
 * 检查当前用户是否为管理员
 * @param members 成员列表
 * @param currentUserId 当前用户的User.id
 * @returns 是否为管理员
 */
export const isCurrentUserAdmin = (members: TripMember[] | null | undefined, currentUserId?: string | null): boolean => {
  if (!members || !currentUserId) return false
  const member = members.find(m => m.userId === currentUserId)
  return member?.role === 'admin'
}

/**
 * 获取当前用户的memberId
 * @param members 成员列表
 * @param currentUserId 当前用户的User.id
 * @returns TripMember.id 或 undefined
 */
export const getCurrentMemberId = (members: TripMember[], currentUserId?: string): string | undefined => {
  if (!currentUserId) return undefined
  const member = members.find(m => m.userId === currentUserId)
  return member?.id
}

/**
 * 获取当前用户的TripMember对象
 * @param members 成员列表
 * @param currentUserId 当前用户的User.id
 * @returns TripMember 或 undefined
 */
export const getCurrentMember = (members: TripMember[], currentUserId?: string): TripMember | undefined => {
  if (!currentUserId) return undefined
  return members.find(m => m.userId === currentUserId)
}

/**
 * 通过memberId获取成员名称
 * @param members 成员列表
 * @param memberId TripMember.id
 * @returns 成员名称
 */
export const getMemberNameById = (members: TripMember[], memberId: string): string => {
  const member = members.find(m => m.id === memberId)
  if (!member) return '未知成员'
  
  if (member.isVirtual) {
    return member.displayName || '虚拟成员'
  }
  
  return member.user?.username || '未知用户'
}

/**
 * 获取成员显示名称
 * @param member 成员对象
 * @returns 显示名称
 */
export const getMemberDisplayName = (member: TripMember | null | undefined): string => {
  if (!member) return '未知'
  
  if (member.isVirtual) {
    return member.displayName || '虚拟成员'
  }
  
  return member.user?.username || '未知用户'
}

/**
 * 通过ID获取成员
 * @param members 成员列表
 * @param memberId 成员ID
 * @returns 成员对象或undefined
 */
export const getMemberById = (members: TripMember[] | null | undefined, memberId: string | null | undefined): TripMember | undefined => {
  if (!members || !memberId) return undefined
  return members.find(m => m.id === memberId)
}

/**
 * 通过名称查找成员
 * @param members 成员列表
 * @param name 成员名称
 * @returns 成员对象或undefined
 */
export const findMemberByName = (members: TripMember[] | null | undefined, name: string | null | undefined): TripMember | undefined => {
  if (!members || !name) return undefined
  
  // 先精确匹配
  const exactMatch = members.find(m => {
    if (m.isVirtual) {
      return m.displayName === name
    }
    return m.user?.username === name
  })
  
  if (exactMatch) return exactMatch
  
  // 再部分匹配
  return members.find(m => {
    if (m.isVirtual) {
      return m.displayName?.includes(name)
    }
    return m.user?.username?.includes(name)
  })
}