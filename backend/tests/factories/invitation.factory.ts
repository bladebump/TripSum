import { PrismaClient, TripInvitation, InviteType, InvitationStatus } from '@prisma/client'

export class InvitationFactory {
  constructor(private prisma: PrismaClient) {}

  async create(overrides: Partial<TripInvitation> = {}): Promise<TripInvitation> {
    const defaultData = {
      tripId: overrides.tripId || '',
      createdBy: overrides.createdBy || '',
      invitedUserId: overrides.invitedUserId || '',
      inviteType: InviteType.ADD,
      status: InvitationStatus.PENDING,
      message: 'Test invitation message',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours later
      createdAt: new Date(),
    }

    return this.prisma.tripInvitation.create({
      data: { ...defaultData, ...overrides }
    })
  }

  async createReplaceInvitation(
    tripId: string,
    createdBy: string,
    invitedUserId: string,
    targetMemberId: string
  ): Promise<TripInvitation> {
    return this.create({
      tripId,
      createdBy,
      invitedUserId,
      inviteType: InviteType.REPLACE,
      targetMemberId,
      message: 'Please replace our virtual member',
    })
  }

  async createAddInvitation(
    tripId: string,
    createdBy: string,
    invitedUserId: string
  ): Promise<TripInvitation> {
    return this.create({
      tripId,
      createdBy,
      invitedUserId,
      inviteType: InviteType.ADD,
      message: 'Welcome to our trip!',
    })
  }

  async createExpiredInvitation(
    tripId: string,
    createdBy: string,
    invitedUserId: string
  ): Promise<TripInvitation> {
    return this.create({
      tripId,
      createdBy,
      invitedUserId,
      expiresAt: new Date(Date.now() - 1000), // Already expired
    })
  }

  async cleanup() {
    await this.prisma.tripInvitation.deleteMany({
      where: {
        message: {
          contains: 'Test'
        }
      }
    })
  }
}