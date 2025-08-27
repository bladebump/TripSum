import api from './api'
import { ApiResponse, Trip, TripMember, CreateTripData, PaginationResult } from '@/types'
import { transformTripData } from '@/utils/dataTransform'

class TripService {
  async createTrip(tripData: CreateTripData): Promise<Trip> {
    const { data } = await api.post<ApiResponse<Trip>>('/trips', tripData)
    if (data.success && data.data) {
      return transformTripData(data.data)
    }
    throw new Error('创建行程失败')
  }

  async getUserTrips(params?: {
    page?: number
    limit?: number
    status?: 'active' | 'completed' | 'all'
  }): Promise<{ trips: Trip[]; pagination: any }> {
    const { data } = await api.get<ApiResponse<{ trips: Trip[]; pagination: any }>>('/trips', {
      params,
    })
    if (data.success && data.data) {
      return {
        trips: data.data.trips.map(trip => transformTripData(trip)),
        pagination: data.data.pagination
      }
    }
    throw new Error('获取行程列表失败')
  }

  async getTripDetail(tripId: string): Promise<Trip> {
    const { data } = await api.get<ApiResponse<Trip>>(`/trips/${tripId}`)
    if (data.success && data.data) {
      return transformTripData(data.data)
    }
    throw new Error('获取行程详情失败')
  }

  async updateTrip(tripId: string, tripData: Partial<CreateTripData>): Promise<Trip> {
    const { data } = await api.put<ApiResponse<Trip>>(`/trips/${tripId}`, tripData)
    if (data.success && data.data) {
      return transformTripData(data.data)
    }
    throw new Error('更新行程失败')
  }

  async deleteTrip(tripId: string): Promise<void> {
    const { data } = await api.delete<ApiResponse>(`/trips/${tripId}`)
    if (!data.success) {
      throw new Error('删除行程失败')
    }
  }

  async addMember(tripId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<TripMember> {
    const { data } = await api.post<ApiResponse<TripMember>>(`/trips/${tripId}/members`, {
      userId,
      role,
    })
    if (data.success && data.data) {
      return transformTripData(data.data)
    }
    throw new Error('添加成员失败')
  }

  async removeMember(tripId: string, userId: string): Promise<void> {
    const { data } = await api.delete<ApiResponse>(`/trips/${tripId}/members/${userId}`)
    if (!data.success) {
      throw new Error('移除成员失败')
    }
  }

  async updateMemberRole(tripId: string, userId: string, role: 'admin' | 'member'): Promise<TripMember> {
    const { data } = await api.put<ApiResponse<TripMember>>(`/trips/${tripId}/members/${userId}`, {
      role,
    })
    if (data.success && data.data) {
      return transformTripData(data.data)
    }
    throw new Error('更新成员角色失败')
  }

  async getTripMembers(tripId: string): Promise<TripMember[]> {
    const { data } = await api.get<ApiResponse<TripMember[]>>(`/trips/${tripId}/members`)
    if (data.success && data.data) {
      return data.data.map(member => transformTripData(member))
    }
    throw new Error('获取成员列表失败')
  }

  async getTripStatistics(tripId: string): Promise<any> {
    const { data } = await api.get<ApiResponse>(`/trips/${tripId}/statistics`)
    if (data.success && data.data) {
      return transformTripData(data.data)
    }
    throw new Error('获取统计数据失败')
  }
}

export default new TripService()