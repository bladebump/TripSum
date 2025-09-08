// 邀请类型
export enum InviteType {
  REPLACE = 'REPLACE', // 替换虚拟成员
  ADD = 'ADD'         // 新增成员
}

// 邀请状态
export enum InvitationStatus {
  PENDING = 'PENDING',     // 待处理
  ACCEPTED = 'ACCEPTED',   // 已接受
  REJECTED = 'REJECTED',   // 已拒绝
  EXPIRED = 'EXPIRED',     // 已过期
  CANCELLED = 'CANCELLED'  // 已取消
}

// 行程邀请
export interface TripInvitation {
  id: string
  tripId: string
  invitedUserId: string
  inviteType: InviteType
  targetMemberId?: string  // 替换模式时的目标虚拟成员ID
  status: InvitationStatus
  message?: string
  createdBy: string
  createdAt: string
  respondedAt?: string
  expiresAt: string
}

// 邀请详情（包含关联信息）
export interface InvitationWithRelations extends TripInvitation {
  trip: {
    id: string
    name: string
    description?: string
    memberCount: number
  }
  inviter: {
    id: string
    username: string
    email?: string
    avatarUrl?: string
  }
  invitedUser: {
    id: string
    username: string
    email?: string
    avatarUrl?: string
  }
  targetMember?: {
    id: string
    displayName?: string
    isVirtual: boolean
  }
}

// 创建邀请请求
export interface CreateInvitationDTO {
  invitedUserId: string
  inviteType: InviteType
  targetMemberId?: string
  message?: string
}

// 邀请列表查询参数
export interface InvitationListQuery {
  status?: InvitationStatus
  page?: number
  limit?: number
}

// 邀请响应
export interface InvitationResponse {
  id: string
  tripId: string
  inviteType: InviteType
  status: InvitationStatus
  message?: string
  createdAt: string
  expiresAt: string
  respondedAt?: string
  trip: {
    id: string
    name: string
    description?: string
    memberCount: number
  }
  inviter: {
    id: string
    username: string
    avatarUrl?: string
  }
  targetMember?: {
    id: string
    displayName?: string
    isVirtual: boolean
  }
}

// 接受邀请结果
export interface AcceptInvitationResult {
  success: boolean
  memberId: string
  isReplacement: boolean
  message: string
}

// 用户搜索结果
export interface UserSearchResult {
  id: string
  username: string
  email: string
  avatarUrl?: string
  createdAt: string
}

// 用户搜索参数
export interface UserSearchQuery {
  keyword: string
  page?: number
  limit?: number
}