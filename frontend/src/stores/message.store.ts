import { create } from 'zustand'
import messageService from '@/services/message.service'
import { 
  MessageWithSender, 
  MessageListQuery, 
  UnreadStats, 
  MessagePreference,
  MessageStatus,
  InvitationWithRelations,
  InvitationStatus
} from '@/types'
import invitationService from '@/services/invitation.service'

interface MessageState {
  // 消息相关
  messages: MessageWithSender[]
  unreadStats: UnreadStats | null
  messageLoading: boolean
  messagePagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  
  // 邀请相关
  invitations: InvitationWithRelations[]
  pendingInvitationsCount: number
  invitationLoading: boolean
  
  // 消息偏好
  messagePreferences: MessagePreference[]
  
  // 消息操作
  fetchMessages: (query?: MessageListQuery) => Promise<void>
  fetchUnreadStats: () => Promise<void>
  markAsRead: (messageId: string) => Promise<void>
  batchMarkAsRead: (messageIds: string[]) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  batchDeleteMessages: (messageIds: string[]) => Promise<void>
  
  // 邀请操作
  fetchInvitations: (query?: { status?: InvitationStatus }) => Promise<void>
  acceptInvitation: (invitationId: string) => Promise<void>
  rejectInvitation: (invitationId: string) => Promise<void>
  
  // 消息偏好操作
  fetchMessagePreferences: () => Promise<void>
  updateMessagePreferences: (preferences: Partial<MessagePreference>[]) => Promise<void>
  
  // Socket事件处理
  handleNewMessage: (message: MessageWithSender) => void
  handleMessageRead: (messageId: string) => void
  handleInvitationReceived: (invitation: any) => void
  
  // 重置
  reset: () => void
}

export const useMessageStore = create<MessageState>((set) => ({
  // 初始状态
  messages: [],
  unreadStats: null,
  messageLoading: false,
  messagePagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  },
  invitations: [],
  pendingInvitationsCount: 0,
  invitationLoading: false,
  messagePreferences: [],
  
  // 获取消息列表
  fetchMessages: async (query?: MessageListQuery) => {
    set({ messageLoading: true })
    try {
      const response = await messageService.getMessages(query)
      set({
        messages: response.messages,
        messagePagination: {
          page: response.page,
          limit: query?.limit || 20,
          total: response.total,
          totalPages: response.totalPages
        },
        messageLoading: false
      })
    } catch (error) {
      console.error('获取消息列表失败:', error)
      set({ messageLoading: false })
      throw error
    }
  },
  
  // 获取未读统计
  fetchUnreadStats: async () => {
    try {
      const stats = await messageService.getUnreadStats()
      set({ unreadStats: stats })
    } catch (error) {
      console.error('获取未读统计失败:', error)
    }
  },
  
  // 标记已读
  markAsRead: async (messageId: string) => {
    try {
      await messageService.markAsRead(messageId)
      
      // 更新本地状态
      set(state => ({
        messages: state.messages.map(msg => 
          msg.id === messageId 
            ? { ...msg, status: MessageStatus.READ, readAt: new Date().toISOString() }
            : msg
        ),
        unreadStats: state.unreadStats ? {
          ...state.unreadStats,
          total: Math.max(0, state.unreadStats.total - 1)
        } : null
      }))
    } catch (error) {
      console.error('标记已读失败:', error)
      throw error
    }
  },
  
  // 批量标记已读
  batchMarkAsRead: async (messageIds: string[]) => {
    try {
      await messageService.batchMarkAsRead(messageIds)
      
      // 更新本地状态
      set(state => ({
        messages: state.messages.map(msg => 
          messageIds.includes(msg.id)
            ? { ...msg, status: MessageStatus.READ, readAt: new Date().toISOString() }
            : msg
        ),
        unreadStats: state.unreadStats ? {
          ...state.unreadStats,
          total: Math.max(0, state.unreadStats.total - messageIds.length)
        } : null
      }))
    } catch (error) {
      console.error('批量标记已读失败:', error)
      throw error
    }
  },
  
  // 删除消息
  deleteMessage: async (messageId: string) => {
    try {
      await messageService.deleteMessage(messageId)
      
      // 更新本地状态
      set(state => ({
        messages: state.messages.filter(msg => msg.id !== messageId),
        messagePagination: {
          ...state.messagePagination,
          total: Math.max(0, state.messagePagination.total - 1)
        }
      }))
    } catch (error) {
      console.error('删除消息失败:', error)
      throw error
    }
  },
  
  // 批量删除消息
  batchDeleteMessages: async (messageIds: string[]) => {
    try {
      await messageService.batchDeleteMessages(messageIds)
      
      // 更新本地状态
      set(state => ({
        messages: state.messages.filter(msg => !messageIds.includes(msg.id)),
        messagePagination: {
          ...state.messagePagination,
          total: Math.max(0, state.messagePagination.total - messageIds.length)
        }
      }))
    } catch (error) {
      console.error('批量删除消息失败:', error)
      throw error
    }
  },
  
  // 获取邀请列表
  fetchInvitations: async (query?) => {
    set({ invitationLoading: true })
    try {
      const response = await invitationService.getMyInvitations(query)
      const pendingCount = response.invitations.filter(
        inv => inv.status === InvitationStatus.PENDING
      ).length
      
      set({
        invitations: response.invitations,
        pendingInvitationsCount: pendingCount,
        invitationLoading: false
      })
    } catch (error) {
      console.error('获取邀请列表失败:', error)
      set({ invitationLoading: false })
      throw error
    }
  },
  
  // 接受邀请
  acceptInvitation: async (invitationId: string) => {
    try {
      await invitationService.acceptInvitation(invitationId)
      
      // 更新本地状态
      set(state => ({
        invitations: state.invitations.map(inv =>
          inv.id === invitationId
            ? { ...inv, status: InvitationStatus.ACCEPTED, respondedAt: new Date().toISOString() }
            : inv
        ),
        pendingInvitationsCount: Math.max(0, state.pendingInvitationsCount - 1)
      }))
    } catch (error) {
      console.error('接受邀请失败:', error)
      throw error
    }
  },
  
  // 拒绝邀请
  rejectInvitation: async (invitationId: string) => {
    try {
      await invitationService.rejectInvitation(invitationId)
      
      // 更新本地状态
      set(state => ({
        invitations: state.invitations.map(inv =>
          inv.id === invitationId
            ? { ...inv, status: InvitationStatus.REJECTED, respondedAt: new Date().toISOString() }
            : inv
        ),
        pendingInvitationsCount: Math.max(0, state.pendingInvitationsCount - 1)
      }))
    } catch (error) {
      console.error('拒绝邀请失败:', error)
      throw error
    }
  },
  
  // 获取消息偏好
  fetchMessagePreferences: async () => {
    try {
      const preferences = await messageService.getMessagePreferences()
      set({ messagePreferences: preferences })
    } catch (error) {
      console.error('获取消息偏好失败:', error)
      throw error
    }
  },
  
  // 更新消息偏好
  updateMessagePreferences: async (preferences: Partial<MessagePreference>[]) => {
    try {
      await messageService.updateMessagePreferences(preferences)
      
      // 更新本地状态
      set(state => ({
        messagePreferences: state.messagePreferences.map(pref => {
          const update = preferences.find(p => p.messageType === pref.messageType)
          return update ? { ...pref, ...update } : pref
        })
      }))
    } catch (error) {
      console.error('更新消息偏好失败:', error)
      throw error
    }
  },
  
  // Socket事件处理 - 新消息
  handleNewMessage: (message: MessageWithSender) => {
    set(state => ({
      messages: [message, ...state.messages],
      unreadStats: state.unreadStats ? {
        ...state.unreadStats,
        total: state.unreadStats.total + 1
      } : null,
      messagePagination: {
        ...state.messagePagination,
        total: state.messagePagination.total + 1
      }
    }))
  },
  
  // Socket事件处理 - 消息已读
  handleMessageRead: (messageId: string) => {
    set(state => ({
      messages: state.messages.map(msg =>
        msg.id === messageId
          ? { ...msg, status: MessageStatus.READ, readAt: new Date().toISOString() }
          : msg
      )
    }))
  },
  
  // Socket事件处理 - 收到邀请
  handleInvitationReceived: (invitation: any) => {
    set(state => ({
      invitations: [invitation, ...state.invitations],
      pendingInvitationsCount: state.pendingInvitationsCount + 1
    }))
  },
  
  // 重置状态
  reset: () => {
    set({
      messages: [],
      unreadStats: null,
      messageLoading: false,
      messagePagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      },
      invitations: [],
      pendingInvitationsCount: 0,
      invitationLoading: false,
      messagePreferences: []
    })
  }
}))