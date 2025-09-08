import api from './api'
import { 
  ApiResponse, 
  MessageListQuery, 
  MessageListResponse,
  MessageWithSender,
  UnreadStats,
  MessagePreference
} from '@/types'

class MessageService {
  /**
   * 获取消息列表
   */
  async getMessages(query?: MessageListQuery): Promise<MessageListResponse> {
    try {
      const { data } = await api.get<ApiResponse<MessageListResponse>>(
        '/messages',
        { params: query }
      )
      if (data.success && data.data) {
        return data.data
      }
      throw new Error(data.error?.message || '获取消息列表失败')
    } catch (error) {
      console.error('获取消息列表失败:', error)
      throw error
    }
  }

  /**
   * 获取消息详情
   */
  async getMessageDetail(messageId: string): Promise<MessageWithSender> {
    try {
      const { data } = await api.get<ApiResponse<MessageWithSender>>(
        `/messages/${messageId}`
      )
      if (data.success && data.data) {
        return data.data
      }
      throw new Error(data.error?.message || '获取消息详情失败')
    } catch (error) {
      console.error('获取消息详情失败:', error)
      throw error
    }
  }

  /**
   * 标记消息为已读
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      const { data } = await api.put<ApiResponse>(
        `/messages/${messageId}/read`
      )
      if (!data.success) {
        throw new Error(data.error?.message || '标记已读失败')
      }
    } catch (error) {
      console.error('标记已读失败:', error)
      throw error
    }
  }

  /**
   * 批量标记已读
   */
  async batchMarkAsRead(messageIds: string[]): Promise<void> {
    try {
      const { data } = await api.post<ApiResponse>(
        '/messages/batch-read',
        { messageIds }
      )
      if (!data.success) {
        throw new Error(data.error?.message || '批量标记已读失败')
      }
    } catch (error) {
      console.error('批量标记已读失败:', error)
      throw error
    }
  }

  /**
   * 归档消息
   */
  async archiveMessage(messageId: string): Promise<void> {
    try {
      const { data } = await api.put<ApiResponse>(
        `/messages/${messageId}/archive`
      )
      if (!data.success) {
        throw new Error(data.error?.message || '归档消息失败')
      }
    } catch (error) {
      console.error('归档消息失败:', error)
      throw error
    }
  }

  /**
   * 删除消息
   */
  async deleteMessage(messageId: string): Promise<void> {
    try {
      const { data } = await api.delete<ApiResponse>(
        `/messages/${messageId}`
      )
      if (!data.success) {
        throw new Error(data.error?.message || '删除消息失败')
      }
    } catch (error) {
      console.error('删除消息失败:', error)
      throw error
    }
  }

  /**
   * 批量删除消息
   */
  async batchDeleteMessages(messageIds: string[]): Promise<void> {
    try {
      const { data } = await api.post<ApiResponse>(
        '/messages/batch-delete',
        { messageIds }
      )
      if (!data.success) {
        throw new Error(data.error?.message || '批量删除失败')
      }
    } catch (error) {
      console.error('批量删除失败:', error)
      throw error
    }
  }

  /**
   * 获取未读统计
   */
  async getUnreadStats(): Promise<UnreadStats> {
    try {
      const { data } = await api.get<ApiResponse<UnreadStats>>(
        '/messages/unread-stats'
      )
      if (data.success && data.data) {
        return data.data
      }
      throw new Error(data.error?.message || '获取未读统计失败')
    } catch (error) {
      console.error('获取未读统计失败:', error)
      throw error
    }
  }

  /**
   * 执行消息操作
   */
  async executeMessageAction(messageId: string, actionType: string): Promise<any> {
    try {
      const { data } = await api.post<ApiResponse>(
        `/messages/${messageId}/actions/${actionType}`
      )
      if (data.success) {
        return data.data
      }
      throw new Error(data.error?.message || '执行操作失败')
    } catch (error) {
      console.error('执行操作失败:', error)
      throw error
    }
  }

  /**
   * 获取消息偏好设置
   */
  async getMessagePreferences(): Promise<MessagePreference[]> {
    try {
      const { data } = await api.get<ApiResponse<MessagePreference[]>>(
        '/message-preferences'
      )
      if (data.success && data.data) {
        return data.data
      }
      throw new Error(data.error?.message || '获取消息偏好失败')
    } catch (error) {
      console.error('获取消息偏好失败:', error)
      throw error
    }
  }

  /**
   * 更新消息偏好设置
   */
  async updateMessagePreferences(preferences: Partial<MessagePreference>[]): Promise<void> {
    try {
      const { data } = await api.put<ApiResponse>(
        '/message-preferences',
        { preferences }
      )
      if (!data.success) {
        throw new Error(data.error?.message || '更新消息偏好失败')
      }
    } catch (error) {
      console.error('更新消息偏好失败:', error)
      throw error
    }
  }
}

export default new MessageService()