import { PrismaClient } from '@prisma/client'
import { UserFactory } from './user.factory'
import { InvitationFactory } from './invitation.factory'
import { MessageFactory } from './message.factory'

export class TestFactories {
  public user: UserFactory
  public invitation: InvitationFactory
  public message: MessageFactory

  constructor(private prisma: PrismaClient) {
    this.user = new UserFactory(prisma)
    this.invitation = new InvitationFactory(prisma)
    this.message = new MessageFactory(prisma)
  }

  async cleanupAll() {
    // Clean up in reverse order of dependencies
    await this.message.cleanup()
    await this.invitation.cleanup()
    
    // Clean up related data
    await this.prisma.expenseParticipant.deleteMany()
    await this.prisma.expense.deleteMany()
    await this.prisma.settlement.deleteMany()
    await this.prisma.tripMember.deleteMany()
    await this.prisma.trip.deleteMany({
      where: {
        name: {
          contains: 'Test'
        }
      }
    })
    
    await this.user.cleanup()
  }
}

export { UserFactory, InvitationFactory, MessageFactory }