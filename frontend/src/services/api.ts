import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios'
import { Toast } from 'antd-mobile'
import { ApiResponse } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

class ApiClient {
  private instance: AxiosInstance

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    this.instance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    this.instance.interceptors.response.use(
      (response) => {
        return response
      },
      async (error: AxiosError<ApiResponse>) => {
        if (error.response?.status === 401) {
          // Don't handle auth errors for login/register endpoints
          const isAuthEndpoint = error.config?.url?.includes('/auth/login') || 
                                error.config?.url?.includes('/auth/register')
          
          if (isAuthEndpoint) {
            // Let login/register handle their own 401 errors
            return Promise.reject(error)
          }
          
          const refreshToken = localStorage.getItem('refreshToken')
          if (refreshToken && !error.config?.url?.includes('/auth/refresh')) {
            try {
              const { data } = await this.post<ApiResponse<{ token: string; refreshToken: string }>>(
                '/auth/refresh',
                { refreshToken }
              )
              if (data.success && data.data) {
                localStorage.setItem('token', data.data.token)
                localStorage.setItem('refreshToken', data.data.refreshToken)
                
                if (error.config) {
                  error.config.headers.Authorization = `Bearer ${data.data.token}`
                  return this.instance.request(error.config)
                }
              }
            } catch (refreshError) {
              this.handleAuthError()
            }
          } else {
            this.handleAuthError()
          }
        } else if (error.response?.data?.error?.message) {
          Toast.show({
            icon: 'fail',
            content: error.response.data.error.message,
          })
        } else if (error.message) {
          Toast.show({
            icon: 'fail',
            content: error.message,
          })
        }
        
        return Promise.reject(error)
      }
    )
  }

  private handleAuthError() {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.instance.get<T>(url, config)
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.instance.post<T>(url, data, config)
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.instance.put<T>(url, data, config)
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.instance.delete<T>(url, config)
  }

  async uploadFile<T = any>(url: string, file: File, additionalData?: Record<string, any>) {
    const formData = new FormData()
    formData.append('receipt', file)
    
    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        const value = additionalData[key]
        if (value !== undefined && value !== null) {
          if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value))
          } else {
            formData.append(key, String(value))
          }
        }
      })
    }

    return this.instance.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  }
}

export default new ApiClient()