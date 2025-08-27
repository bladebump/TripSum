import api from './api'
import { ApiResponse, AuthResponse, LoginCredentials, RegisterCredentials, User } from '@/types'

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { data } = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials)
      if (data.success && data.data) {
        this.saveAuthData(data.data)
        return data.data
      }
      throw new Error('登录失败')
    } catch (error: any) {
      // Extract error message from API response
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message || 
                          '登录失败'
      throw new Error(errorMessage)
    }
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const { data } = await api.post<ApiResponse<AuthResponse>>('/auth/register', credentials)
      if (data.success && data.data) {
        this.saveAuthData(data.data)
        return data.data
      }
      throw new Error('注册失败')
    } catch (error: any) {
      // Extract error message from API response
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message || 
                          '注册失败'
      throw new Error(errorMessage)
    }
  }

  async getProfile(): Promise<User> {
    const { data } = await api.get<ApiResponse<User>>('/auth/profile')
    if (data.success && data.data) {
      return data.data
    }
    throw new Error('获取用户信息失败')
  }

  async updateProfile(profileData: { username?: string; avatarUrl?: string }): Promise<User> {
    const { data } = await api.put<ApiResponse<User>>('/auth/profile', profileData)
    if (data.success && data.data) {
      const currentUser = this.getCurrentUser()
      if (currentUser) {
        const updatedUser = { ...currentUser, ...data.data }
        localStorage.setItem('user', JSON.stringify(updatedUser))
      }
      return data.data
    }
    throw new Error('更新用户信息失败')
  }

  async refreshToken(): Promise<{ token: string; refreshToken: string }> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      throw new Error('No refresh token')
    }

    const { data } = await api.post<ApiResponse<{ token: string; refreshToken: string }>>(
      '/auth/refresh',
      { refreshToken }
    )
    
    if (data.success && data.data) {
      localStorage.setItem('token', data.data.token)
      localStorage.setItem('refreshToken', data.data.refreshToken)
      return data.data
    }
    throw new Error('刷新token失败')
  }

  logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  isAuthenticated(): boolean {
    return !!this.getToken()
  }

  getToken(): string | null {
    return localStorage.getItem('token')
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken')
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  }

  private saveAuthData(authData: AuthResponse) {
    localStorage.setItem('token', authData.token)
    localStorage.setItem('refreshToken', authData.refreshToken)
    localStorage.setItem('user', JSON.stringify(authData.user))
  }
}

export default new AuthService()