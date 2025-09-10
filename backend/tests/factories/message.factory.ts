import { 
  PrismaClient, 
  Message, 
  MessageType, 
  MessageStatus, 
  MessagePriority,
  MessageCategory 
} from '@prisma/client'

export class MessageFactory {
  constructor(private prisma: PrismaClient) {}

  async create(overrides: any = {}): Promise<Message> {
    const defaultData = {
      recipientId: overrides.recipientId || 'test-recipient-id',
      type: overrides.type || MessageType.SYSTEM_ANNOUNCEMENT,
      category: overrides.category || MessageCategory.SYSTEM,
      priority: overrides.priority || MessagePriority.NORMAL,
      status: overrides.status || MessageStatus.UNREAD,
      title: overrides.title || 'Test Message',
      content: overrides.content || 'This is a test message content',
      metadata: overrides.metadata || {},
      relatedEntity: overrides.relatedEntity || null,
    }

    return this.prisma.message.create({
      data: defaultData
    })
  }

  async createInvitationMessage(
    recipientId: string,
    invitationId: string,
    inviterName: string,
    tripName: string
  ): Promise<Message> {
    return this.create({
      recipientId,
      type: MessageType.TRIP_INVITATION,
      category: MessageCategory.TRIP,
      priority: MessagePriority.HIGH,
      title: `${inviterName}邀请您加入行程`,
      content: `${inviterName}邀请您加入行程"${tripName}"`,
      metadata: {
        invitationId,
        inviterName,
        tripName,
      },
      relatedEntity: {
        type: 'invitation',
        id: invitationId,
      },
    })
  }

  async createExpenseMessage(
    recipientId: string,
    expenseId: string,
    payerName: string,
    amount: number
  ): Promise<Message> {
    return this.create({
      recipientId,
      type: MessageType.EXPENSE_CREATED,
      category: MessageCategory.EXPENSE,
      priority: MessagePriority.NORMAL,
      title: '新的支出记录',
      content: `${payerName}添加了一笔${amount}元的支出`,
      metadata: {
        expenseId,
        payerName,
        amount,
      },
      relatedEntity: {
        type: 'expense',
        id: expenseId,
      },
    })
  }

  async createSettlementMessage(
    recipientId: string,
    settlementId: string,
    fromMember: string,
    toMember: string,
    amount: number
  ): Promise<Message> {
    return this.create({
      recipientId,
      type: MessageType.SETTLEMENT_RECEIVED,
      category: MessageCategory.EXPENSE,
      priority: MessagePriority.HIGH,
      title: '新的结算记录',
      content: `${fromMember}需要向${toMember}支付${amount}元`,
      metadata: {
        settlementId,
        fromMember,
        toMember,
        amount,
      },
      relatedEntity: {
        type: 'settlement',
        id: settlementId,
      },
    })
  }

  async createBatch(count: number, recipientId: string): Promise<Message[]> {
    const messages: Message[] = []
    for (let i = 0; i < count; i++) {
      const message = await this.create({
        recipientId,
        title: `Test Message ${i}`,
        content: `This is test message content ${i}`,
      })
      messages.push(message)
    }
    return messages
  }

  async markAsRead(messageId: string): Promise<Message> {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { 
        status: MessageStatus.READ,
        readAt: new Date(),
      }
    })
  }

  async cleanup() {
    await this.prisma.message.deleteMany({
      where: {
        title: {
          contains: 'Test'
        }
      }
    })
  }
}