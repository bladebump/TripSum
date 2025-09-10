import { TripMember } from '@/types'

/**
 * 权限工具函数
 * 用于判断用户在行程中的各种权限
 */

/**
 * 判断成员是否为管理员
 */
export const isAdmin = (member: TripMember | null | undefined): boolean => {
  return member?.role === 'admin'
}

/**
 * 判断成员是否可以创建费用
 * 目前只有管理员可以创建费用
 */
export const canCreateExpense = (member: TripMember | null | undefined): boolean => {
  return isAdmin(member)
}

/**
 * 判断成员是否可以编辑费用
 * 目前只有管理员可以编辑费用
 */
export const canEditExpense = (member: TripMember | null | undefined): boolean => {
  return isAdmin(member)
}

/**
 * 判断成员是否可以删除费用
 * 目前只有管理员可以删除费用
 */
export const canDeleteExpense = (member: TripMember | null | undefined): boolean => {
  return isAdmin(member)
}

/**
 * 判断成员是否可以查看费用
 * 所有成员都可以查看费用
 */
export const canViewExpense = (member: TripMember | null | undefined): boolean => {
  return !!member
}

/**
 * 判断成员是否可以导出数据
 * 所有成员都可以导出数据
 */
export const canExport = (member: TripMember | null | undefined): boolean => {
  return !!member
}

/**
 * 判断成员是否可以邀请新成员
 * 只有管理员可以邀请新成员
 */
export const canInviteMember = (member: TripMember | null | undefined): boolean => {
  return isAdmin(member)
}

/**
 * 判断成员是否可以添加虚拟成员
 * 只有管理员可以添加虚拟成员
 */
export const canAddVirtualMember = (member: TripMember | null | undefined): boolean => {
  return isAdmin(member)
}

/**
 * 判断成员是否可以删除行程
 * 只有管理员可以删除行程
 */
export const canDeleteTrip = (member: TripMember | null | undefined): boolean => {
  return isAdmin(member)
}

/**
 * 判断成员是否可以管理成员（踢出成员、转让管理员等）
 * 只有管理员可以管理成员
 */
export const canManageMembers = (member: TripMember | null | undefined): boolean => {
  return isAdmin(member)
}

/**
 * 判断成员是否可以使用AI记账
 * 目前只有管理员可以使用AI记账
 */
export const canUseAIExpense = (member: TripMember | null | undefined): boolean => {
  return isAdmin(member)
}

/**
 * 判断成员是否可以查看结算
 * 所有成员都可以查看结算
 */
export const canViewSettlement = (member: TripMember | null | undefined): boolean => {
  return !!member
}

/**
 * 判断成员是否可以确认结算
 * 只有管理员可以确认结算
 */
export const canConfirmSettlement = (member: TripMember | null | undefined): boolean => {
  return isAdmin(member)
}

/**
 * 获取权限不足的提示文案
 */
export const getPermissionDeniedMessage = (action: string): string => {
  const messages: Record<string, string> = {
    createExpense: '暂时仅管理员可记账',
    editExpense: '暂时仅管理员可编辑费用',
    deleteExpense: '暂时仅管理员可删除费用',
    inviteMember: '仅管理员可邀请新成员',
    addVirtualMember: '仅管理员可添加虚拟成员',
    deleteTrip: '仅管理员可删除行程',
    manageMembers: '仅管理员可管理成员',
    useAIExpense: '暂时仅管理员可使用AI记账',
    confirmSettlement: '仅管理员可确认结算',
    default: '您没有权限执行此操作'
  }
  
  return messages[action] || messages.default
}

/**
 * 批量检查权限
 * 返回一个包含所有权限状态的对象
 */
export const checkPermissions = (member: TripMember | null | undefined) => {
  return {
    isAdmin: isAdmin(member),
    canCreateExpense: canCreateExpense(member),
    canEditExpense: canEditExpense(member),
    canDeleteExpense: canDeleteExpense(member),
    canViewExpense: canViewExpense(member),
    canExport: canExport(member),
    canInviteMember: canInviteMember(member),
    canAddVirtualMember: canAddVirtualMember(member),
    canDeleteTrip: canDeleteTrip(member),
    canManageMembers: canManageMembers(member),
    canUseAIExpense: canUseAIExpense(member),
    canViewSettlement: canViewSettlement(member),
    canConfirmSettlement: canConfirmSettlement(member)
  }
}