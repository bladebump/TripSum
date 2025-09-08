import api from './api'
import { 
  ApiResponse, 
  CreateInvitationDTO, 
  InvitationResponse, 
  InvitationListQuery,
  AcceptInvitationResult,
  InvitationWithRelations
} from '@/types'

class InvitationService {
  /**
   * 发送邀请
   */
  async sendInvitation(tripId: string, data: CreateInvitationDTO): Promise<InvitationResponse> {
    try {
      const { data: response } = await api.post<ApiResponse<InvitationResponse>>(
        `/trips/${tripId}/invitations`,
        data
      )
      if (response.success && response.data) {
        return response.data
      }
      throw new Error(response.error?.message || '发送邀请失败')
    } catch (error) {
      console.error('发送邀请失败:', error)
      throw error
    }
  }

  /**
   * 获取行程的邀请列表（管理员）
   */
  async getTripInvitations(tripId: string, query?: InvitationListQuery): Promise<{
    invitations: InvitationResponse[]
    total: number
    page: number
    totalPages: number
  }> {
    try {
      const { data } = await api.get<ApiResponse<{
        invitations: InvitationResponse[]
        total: number
        page: number
        totalPages: number
      }>>(
        `/trips/${tripId}/invitations`,
        { params: query }
      )
      if (data.success && data.data) {
        return data.data
      }
      throw new Error(data.error?.message || '获取邀请列表失败')
    } catch (error) {
      console.error('获取邀请列表失败:', error)
      throw error
    }
  }

  /**
   * 获取我收到的邀请列表
   */
  async getMyInvitations(query?: InvitationListQuery): Promise<{
    invitations: InvitationWithRelations[]
    total: number
    page: number
    totalPages: number
  }> {
    try {
      const { data } = await api.get<ApiResponse<{
        invitations: InvitationWithRelations[]
        total: number
        page: number
        totalPages: number
      }>>(
        '/invitations',
        { params: query }
      )
      if (data.success && data.data) {
        return data.data
      }
      throw new Error(data.error?.message || '获取邀请列表失败')
    } catch (error) {
      console.error('获取邀请列表失败:', error)
      throw error
    }
  }

  /**
   * 获取邀请详情
   */
  async getInvitationDetail(invitationId: string): Promise<InvitationWithRelations> {
    try {
      const { data } = await api.get<ApiResponse<InvitationWithRelations>>(
        `/invitations/${invitationId}`
      )
      if (data.success && data.data) {
        return data.data
      }
      throw new Error(data.error?.message || '获取邀请详情失败')
    } catch (error) {
      console.error('获取邀请详情失败:', error)
      throw error
    }
  }

  /**
   * 接受邀请
   */
  async acceptInvitation(invitationId: string): Promise<AcceptInvitationResult> {
    try {
      const { data } = await api.post<ApiResponse<AcceptInvitationResult>>(
        `/invitations/${invitationId}/accept`
      )
      if (data.success && data.data) {
        return data.data
      }
      throw new Error(data.error?.message || '接受邀请失败')
    } catch (error) {
      console.error('接受邀请失败:', error)
      throw error
    }
  }

  /**
   * 拒绝邀请
   */
  async rejectInvitation(invitationId: string): Promise<void> {
    try {
      const { data } = await api.post<ApiResponse>(
        `/invitations/${invitationId}/reject`
      )
      if (!data.success) {
        throw new Error(data.error?.message || '拒绝邀请失败')
      }
    } catch (error) {
      console.error('拒绝邀请失败:', error)
      throw error
    }
  }

  /**
   * 撤销邀请（管理员）
   */
  async cancelInvitation(invitationId: string): Promise<void> {
    try {
      const { data } = await api.delete<ApiResponse>(
        `/invitations/${invitationId}`
      )
      if (!data.success) {
        throw new Error(data.error?.message || '撤销邀请失败')
      }
    } catch (error) {
      console.error('撤销邀请失败:', error)
      throw error
    }
  }
}

export default new InvitationService()