import { create } from 'zustand'
import { Trip, TripMember, CreateTripData } from '@/types'
import tripService from '@/services/trip.service'

interface TripState {
  trips: Trip[]
  currentTrip: Trip | null
  members: TripMember[]
  loading: boolean
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  setTrips: (trips: Trip[]) => void
  setCurrentTrip: (trip: Trip | null) => void
  setMembers: (members: TripMember[]) => void
  setLoading: (loading: boolean) => void
  setPagination: (pagination: any) => void
  fetchTrips: (params?: any) => Promise<void>
  fetchTripDetail: (tripId: string) => Promise<void>
  createTrip: (data: CreateTripData) => Promise<Trip>
  updateTrip: (tripId: string, data: Partial<CreateTripData>) => Promise<void>
  deleteTrip: (tripId: string) => Promise<void>
  fetchMembers: (tripId: string) => Promise<void>
  addMember: (tripId: string, userId: string, role?: 'admin' | 'member') => Promise<void>
  removeMember: (tripId: string, memberId: string) => Promise<void>
}

export const useTripStore = create<TripState>((set, get) => ({
  trips: [],
  currentTrip: null,
  members: [],
  loading: false,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },

  setTrips: (trips) => set({ trips }),
  setCurrentTrip: (trip) => set({ currentTrip: trip }),
  setMembers: (members) => set({ members }),
  setLoading: (loading) => set({ loading }),
  setPagination: (pagination) => set({ pagination }),

  fetchTrips: async (params) => {
    set({ loading: true })
    try {
      console.log('fetchTrips 调用参数：', params)
      const response = await tripService.getUserTrips(params)
      console.log('fetchTrips 服务器响应：', response)
      
      const { trips: currentTrips } = get()
      const isFirstPage = !params?.page || params.page === 1
      
      // 如果是第一页，直接替换；如果是分页，则追加
      const newTrips = isFirstPage ? response.trips : [...currentTrips, ...response.trips]
      
      console.log('fetchTrips 更新后的trips数量：', newTrips.length)
      set({ trips: newTrips, pagination: response.pagination, loading: false })
    } catch (error) {
      console.error('fetchTrips 错误：', error)
      set({ loading: false })
      throw error
    }
  },

  fetchTripDetail: async (tripId) => {
    set({ loading: true })
    try {
      // 并行调用基础信息和统计信息API
      const [trip, statistics] = await Promise.all([
        tripService.getTripDetail(tripId),
        tripService.getTripStatistics(tripId)
      ])
      
      // 合并统计信息到trip对象
      const tripWithStatistics = {
        ...trip,
        statistics
      }
      
      // 从统计数据中提取成员信息并同步到store
      const membersFromStats = statistics.membersFinancialStatus?.map((member: any) => ({
        id: member.memberId,
        userId: member.userId,
        username: member.username,
        isVirtual: member.isVirtual,
        displayName: member.isVirtual ? member.username : undefined,
        role: member.role,
        contribution: member.contribution,
        balance: member.balance,
        totalPaid: member.totalPaid,
        totalShare: member.totalShare,
        isActive: true,
        tripId,
        user: member.isVirtual ? null : { username: member.username }
      })) || []
      
      set({ 
        currentTrip: tripWithStatistics, 
        members: membersFromStats,
        loading: false 
      })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  createTrip: async (data) => {
    set({ loading: true })
    try {
      console.log('createTrip 开始创建行程：', data)
      const trip = await tripService.createTrip(data)
      console.log('createTrip 创建成功，返回数据：', trip)
      
      const { trips } = get()
      const newTrips = [trip, ...trips]
      console.log('createTrip 更新trips列表，新数量：', newTrips.length)
      
      set({ trips: newTrips, loading: false })
      return trip
    } catch (error) {
      console.error('createTrip 创建失败：', error)
      set({ loading: false })
      throw error
    }
  },

  updateTrip: async (tripId, data) => {
    set({ loading: true })
    try {
      const updatedTrip = await tripService.updateTrip(tripId, data)
      const { trips } = get()
      set({
        trips: trips.map(t => t.id === tripId ? updatedTrip : t),
        currentTrip: updatedTrip,
        loading: false
      })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  deleteTrip: async (tripId) => {
    set({ loading: true })
    try {
      await tripService.deleteTrip(tripId)
      const { trips } = get()
      set({
        trips: trips.filter(t => t.id !== tripId),
        loading: false
      })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  fetchMembers: async (tripId) => {
    set({ loading: true })
    try {
      const members = await tripService.getTripMembers(tripId)
      set({ members, loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  addMember: async (tripId, userId, role = 'member') => {
    try {
      const member = await tripService.addMember(tripId, userId, role)
      const { members } = get()
      set({ members: [...members, member] })
    } catch (error) {
      throw error
    }
  },

  removeMember: async (tripId, memberId) => {
    try {
      await tripService.removeMember(tripId, memberId)
      const { members } = get()
      set({ members: members.filter(m => m.id !== memberId) })
    } catch (error) {
      throw error
    }
  },
}))