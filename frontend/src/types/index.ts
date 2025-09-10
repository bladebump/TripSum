export * from './user.types'
export * from './trip.types'
export * from './expense.types'
export * from './message.types'
export * from './invitation.types'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  timestamp: number
}

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginationResult<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}