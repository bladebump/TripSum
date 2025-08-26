import { create } from 'zustand'
import { User } from '@/types'
import authService from '@/services/auth.service'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: authService.getCurrentUser(),
  isAuthenticated: authService.isAuthenticated(),
  loading: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  setLoading: (loading) => set({ loading }),

  login: async (email, password) => {
    set({ loading: true })
    try {
      const response = await authService.login({ email, password })
      set({ user: response.user, isAuthenticated: true, loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  register: async (username, email, password) => {
    set({ loading: true })
    try {
      const response = await authService.register({ username, email, password })
      set({ user: response.user, isAuthenticated: true, loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  logout: () => {
    authService.logout()
    set({ user: null, isAuthenticated: false })
  },

  checkAuth: () => {
    const user = authService.getCurrentUser()
    const isAuthenticated = authService.isAuthenticated()
    set({ user, isAuthenticated })
  },
}))