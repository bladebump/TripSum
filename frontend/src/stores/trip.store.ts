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
  removeMember: (tripId: string, userId: string) => Promise<void>
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
      const response = await tripService.getUserTrips(params)
      set({ trips: response.trips, pagination: response.pagination, loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  fetchTripDetail: async (tripId) => {
    set({ loading: true })
    try {
      const trip = await tripService.getTripDetail(tripId)
      set({ currentTrip: trip, loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  createTrip: async (data) => {
    set({ loading: true })
    try {
      const trip = await tripService.createTrip(data)
      const { trips } = get()
      set({ trips: [trip, ...trips], loading: false })
      return trip
    } catch (error) {
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

  removeMember: async (tripId, userId) => {
    try {
      await tripService.removeMember(tripId, userId)
      const { members } = get()
      set({ members: members.filter(m => m.userId !== userId) })
    } catch (error) {
      throw error
    }
  },
}))