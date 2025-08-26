import { Response } from 'express'
import { ApiResponse } from '../types'

export const sendSuccess = <T = any>(
  res: Response,
  data: T,
  statusCode = 200
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: Date.now(),
  }
  return res.status(statusCode).json(response)
}

export const sendError = (
  res: Response,
  code: string,
  message: string,
  statusCode = 400
): Response => {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
    },
    timestamp: Date.now(),
  }
  return res.status(statusCode).json(response)
}

export const sendPaginatedResponse = <T = any>(
  res: Response,
  items: T[],
  page: number,
  limit: number,
  total: number
): Response => {
  const response: ApiResponse = {
    success: true,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    timestamp: Date.now(),
  }
  return res.status(200).json(response)
}