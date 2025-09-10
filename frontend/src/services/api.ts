import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios'
import { Toast } from 'antd-mobile'
import { ApiResponse } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

class ApiClient {
  private instance: AxiosInstance
  private isRefreshing = false
  private refreshQueue: Array<(token: string) => void> = []

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
        const originalConfig = error.config as any
        
        // Prevent infinite loops - mark if this request has been refreshed
        if (originalConfig?._isRetry) {
          return Promise.reject(error)
        }
        
        if (error.response?.status === 401) {
          // Don't handle auth errors for login/register/refresh endpoints
          const isAuthEndpoint = originalConfig?.url?.includes('/auth/login') || 
                                originalConfig?.url?.includes('/auth/register') ||
                                originalConfig?.url?.includes('/auth/refresh')
          
          const refreshToken = localStorage.getItem('refreshToken')
          
          
          if (isAuthEndpoint) {
            // Let auth endpoints handle their own 401 errors
            return Promise.reject(error)
          }
          
          if (refreshToken) {
            // If already refreshing, queue this request
            if (this.isRefreshing) {
              return new Promise((resolve) => {
                this.refreshQueue.push((token: string) => {
                  if (originalConfig) {
                    originalConfig.headers.Authorization = `Bearer ${token}`
                    resolve(this.instance.request(originalConfig))
                  }
                })
              })
            }
            
            // Start refreshing
            this.isRefreshing = true
            
            
            try {
              // Use direct axios call to avoid interceptor recursion
              const { data } = await axios.post<ApiResponse<{ token: string; refreshToken: string }>>(
                `${API_BASE_URL}/auth/refresh`,
                { refreshToken },
                {
                  headers: {
                    'Content-Type': 'application/json',
                  }
                }
              )
              
              
              if (data.success && data.data) {
                
                localStorage.setItem('token', data.data.token)
                localStorage.setItem('refreshToken', data.data.refreshToken)
                
                
                // Process queued requests
                this.refreshQueue.forEach(callback => callback(data.data!.token))
                this.refreshQueue = []
                
                // Retry original request
                if (originalConfig) {
                  // Ensure headers object exists and is properly set
                  if (!originalConfig.headers) {
                    originalConfig.headers = {}
                  }
                  originalConfig.headers['Authorization'] = `Bearer ${data.data!.token}`
                  originalConfig._isRetry = true  // Mark as retry to prevent loops
                  
                  return this.instance.request(originalConfig)
                }
              } else {
                throw new Error('Refresh failed')
              }
            } catch (refreshError) {
              // Clear queue on refresh failure
              this.refreshQueue = []
              this.handleAuthError()
              return Promise.reject(refreshError)
            } finally {
              this.isRefreshing = false
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

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.instance.patch<T>(url, data, config)
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