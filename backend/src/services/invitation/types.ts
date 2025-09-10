import { InviteType, InvitationStatus } from '@prisma/client'

export interface CreateInvitationData {
  invitedUserId: string
  inviteType: InviteType
  targetMemberId?: string
  message?: string
}

export interface InvitationQueryParams {
  page?: number
  limit?: number
  status?: InvitationStatus
  type?: 'sent' | 'received'
}

export interface AcceptInvitationResult {
  success: boolean
  memberId: string
  message: string
}