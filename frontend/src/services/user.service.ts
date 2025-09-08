import api from './api'
import { ApiResponse, UserSearchResult, UserSearchQuery } from '@/types'

class UserService {
  /**
   * 搜索用户
   */
  async searchUsers(query: UserSearchQuery): Promise<UserSearchResult[]> {
    try {
      const { data } = await api.get<ApiResponse<UserSearchResult[]>>(
        '/users/search',
        { params: query }
      )
      if (data.success && data.data) {
        return data.data
      }
      throw new Error(data.error?.message || '搜索用户失败')
    } catch (error) {
      console.error('搜索用户失败:', error)
      throw error
    }
  }

  /**
   * 获取用户详情
   */
  async getUserById(userId: string): Promise<UserSearchResult> {
    try {
      const { data } = await api.get<ApiResponse<UserSearchResult>>(
        `/users/${userId}`
      )
      if (data.success && data.data) {
        return data.data
      }
      throw new Error(data.error?.message || '获取用户信息失败')
    } catch (error) {
      console.error('获取用户信息失败:', error)
      throw error
    }
  }

  /**
   * 获取我的行程列表
   */
  async getMyTrips() {
    try {
      const { data } = await api.get<ApiResponse>('/users/me/trips')
      if (data.success && data.data) {
        return data.data
      }
      throw new Error(data.error?.message || '获取行程列表失败')
    } catch (error) {
      console.error('获取行程列表失败:', error)
      throw error
    }
  }
}

export default new UserService()