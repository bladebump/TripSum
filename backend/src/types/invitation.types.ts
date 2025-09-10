import { TripInvitation, InviteType, InvitationStatus, User, Trip, TripMember } from '@prisma/client';

export interface CreateInvitationDTO {
  invitedUserId: string;
  inviteType: InviteType;
  targetMemberId?: string;
  message?: string;
}

export interface InvitationWithRelations extends TripInvitation {
  trip: Trip;
  invitedUser: Pick<User, 'id' | 'username' | 'email' | 'avatarUrl'>;
  inviter: Pick<User, 'id' | 'username' | 'email' | 'avatarUrl'>;
  targetMember?: TripMember | null;
}

export interface InvitationListQuery {
  status?: InvitationStatus;
  type?: 'sent' | 'received';
  page?: number;
  limit?: number;
}

export interface InvitationResponse {
  id: string;
  tripId: string;
  inviteType: InviteType;
  status: InvitationStatus;
  message?: string;
  createdAt: Date;
  expiresAt: Date;
  respondedAt?: Date;
  trip: {
    id: string;
    name: string;
    description?: string;
    memberCount: number;
  };
  inviter: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  targetMember?: {
    id: string;
    displayName?: string;
    isVirtual: boolean;
  };
}

export interface AcceptInvitationResult {
  success: boolean;
  memberId: string;
  isReplacement: boolean;
  message: string;
}