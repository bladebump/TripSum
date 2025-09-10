import { io } from '../app';
import { messageService } from './message.service';
import { MessageType, MessagePriority } from '@prisma/client';
import { MessageAction, RelatedEntity } from '../types/message.types';

export class NotificationService {
  /**
   * 发送邀请通知
   */
  async sendInvitationNotification(data: {
    recipientId: string;
    inviterName: string;
    tripName: string;
    invitationId: string;
    message?: string;
  }) {
    const { recipientId, inviterName, tripName, invitationId, message } = data;

    // 创建站内消息
    const createdMessage = await messageService.createMessage({
      recipientId,
      type: MessageType.TRIP_INVITATION,
      category: 'TRIP',
      priority: MessagePriority.HIGH,
      title: `${inviterName}邀请您加入行程`,
      content: `${inviterName}邀请您加入行程"${tripName}"。${message ? `\n留言：${message}` : ''}`,
      actions: [
        {
          type: 'accept',
          label: '接受邀请',
          url: `/api/invitations/${invitationId}/accept`,
          method: 'POST',
        },
        {
          type: 'reject',
          label: '拒绝邀请',
          url: `/api/invitations/${invitationId}/reject`,
          method: 'POST',
        },
      ] as MessageAction[],
      relatedEntity: {
        type: 'invitation',
        id: invitationId,
      } as RelatedEntity,
    });

    // 通过Socket.io实时推送
    this.emitToUser(recipientId, 'message:new', createdMessage);
    this.emitToUser(recipientId, 'invitation:received', {
      invitationId,
      inviterName,
      tripName,
    });

    return createdMessage;
  }

  /**
   * 发送邀请被接受通知
   */
  async sendInvitationAcceptedNotification(data: {
    recipientId: string;
    accepterName: string;
    tripName: string;
    tripId: string;
  }) {
    const { recipientId, accepterName, tripName, tripId } = data;

    // 创建站内消息
    const message = await messageService.createMessage({
      recipientId,
      type: MessageType.TRIP_INVITATION_ACCEPTED,
      category: 'TRIP',
      priority: MessagePriority.NORMAL,
      title: '邀请已被接受',
      content: `${accepterName}接受了您的邀请，已加入行程"${tripName}"。`,
      relatedEntity: {
        type: 'trip',
        id: tripId,
      } as RelatedEntity,
    });

    // 通过Socket.io实时推送
    this.emitToUser(recipientId, 'message:new', message);
    this.emitToUser(recipientId, 'invitation:accepted', {
      accepterName,
      tripName,
      tripId,
    });

    return message;
  }

  /**
   * 发送邀请被拒绝通知
   */
  async sendInvitationRejectedNotification(data: {
    recipientId: string;
    rejecterName: string;
    tripName: string;
  }) {
    const { recipientId, rejecterName, tripName } = data;

    // 创建站内消息
    const message = await messageService.createMessage({
      recipientId,
      type: MessageType.TRIP_INVITATION_REJECTED,
      category: 'TRIP',
      priority: MessagePriority.LOW,
      title: '邀请已被拒绝',
      content: `${rejecterName}拒绝了您的邀请加入行程"${tripName}"。`,
    });

    // 通过Socket.io实时推送
    this.emitToUser(recipientId, 'message:new', message);
    this.emitToUser(recipientId, 'invitation:rejected', {
      rejecterName,
      tripName,
    });

    return message;
  }

  /**
   * 发送成员加入行程通知
   */
  async sendMemberJoinedNotification(data: {
    tripId: string;
    tripName: string;
    memberName: string;
    memberIds: string[];
    isReplacement: boolean;
    replacedMemberName?: string;
  }) {
    const { tripId, tripName, memberName, memberIds, isReplacement, replacedMemberName } = data;

    const title = isReplacement ? '成员替换通知' : '新成员加入';
    const content = isReplacement 
      ? `${memberName}已替换虚拟成员"${replacedMemberName}"，成为行程"${tripName}"的正式成员。`
      : `${memberName}已加入行程"${tripName}"。`;

    // 为每个成员创建消息
    const messagePromises = memberIds.map(memberId =>
      messageService.createMessage({
        recipientId: memberId,
        type: MessageType.TRIP_MEMBER_JOINED,
        category: 'TRIP',
        priority: MessagePriority.NORMAL,
        title,
        content,
        relatedEntity: {
          type: 'trip',
          id: tripId,
        } as RelatedEntity,
      })
    );

    const messages = await Promise.all(messagePromises);

    // 广播到行程房间
    this.emitToTrip(tripId, 'member:joined', {
      memberName,
      isReplacement,
      replacedMemberName,
    });

    return messages;
  }

  /**
   * 发送费用创建通知
   */
  async sendExpenseCreatedNotification(data: {
    tripId: string;
    expenseId: string;
    creatorName: string;
    amount: number;
    description: string;
    participantIds: string[];
  }) {
    const { tripId, expenseId, creatorName, amount, description, participantIds } = data;

    // 为参与者创建消息
    const messagePromises = participantIds.map(participantId =>
      messageService.createMessage({
        recipientId: participantId,
        type: MessageType.EXPENSE_CREATED,
        category: 'EXPENSE',
        priority: MessagePriority.LOW,
        title: '新支出记录',
        content: `${creatorName}记录了一笔支出：${description}，金额￥${amount}。`,
        relatedEntity: {
          type: 'expense',
          id: expenseId,
        } as RelatedEntity,
      })
    );

    const messages = await Promise.all(messagePromises);

    // 广播到行程房间
    this.emitToTrip(tripId, 'expense:created', {
      expenseId,
      creatorName,
      amount,
      description,
    });

    return messages;
  }

  /**
   * 发送结算提醒
   */
  async sendSettlementReminder(data: {
    recipientId: string;
    tripName: string;
    amount: number;
    toMemberName: string;
  }) {
    const { recipientId, tripName, amount, toMemberName } = data;

    const message = await messageService.createMessage({
      recipientId,
      type: MessageType.SETTLEMENT_REMINDER,
      category: 'EXPENSE',
      priority: MessagePriority.HIGH,
      title: '结算提醒',
      content: `您在行程"${tripName}"中需要向${toMemberName}支付￥${amount}。`,
    });

    // 通过Socket.io实时推送
    this.emitToUser(recipientId, 'message:new', message);

    return message;
  }

  /**
   * 发送系统公告
   */
  async sendSystemAnnouncement(data: {
    userIds: string[];
    title: string;
    content: string;
    priority?: MessagePriority;
  }) {
    const { userIds, title, content, priority = MessagePriority.NORMAL } = data;

    const messagePromises = userIds.map(userId =>
      messageService.createMessage({
        recipientId: userId,
        type: MessageType.SYSTEM_ANNOUNCEMENT,
        category: 'SYSTEM',
        priority,
        title,
        content,
      })
    );

    const messages = await Promise.all(messagePromises);

    // 广播给所有用户
    userIds.forEach(userId => {
      this.emitToUser(userId, 'message:new', messages[0]);
    });

    return messages;
  }

  /**
   * 向特定用户发送Socket.io事件
   */
  private emitToUser(userId: string, event: string, data: any) {
    io.to(`user-${userId}`).emit(event, data);
  }

  /**
   * 向行程房间发送Socket.io事件
   */
  private emitToTrip(tripId: string, event: string, data: any) {
    io.to(`trip-${tripId}`).emit(event, data);
  }

  /**
   * 获取用户的Socket连接
   */
  getUserSockets(userId: string) {
    return io.sockets.adapter.rooms.get(`user-${userId}`);
  }

  /**
   * 检查用户是否在线
   */
  isUserOnline(userId: string): boolean {
    const room = this.getUserSockets(userId);
    return room ? room.size > 0 : false;
  }
}

export const notificationService = new NotificationService();