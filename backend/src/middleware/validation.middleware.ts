import { Request, Response, NextFunction } from 'express'
import { ObjectSchema } from 'joi'
import { AuthenticatedRequest } from '../types'
import { sendError } from '../utils/response'

export const validate = (schema: ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body)
    
    if (error) {
      const message = error.details[0].message
      sendError(res, '400', message, 400)
      return
    }
    
    next()
  }
}

export const validateWithContext = (schema: ObjectSchema) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // 合并context数据和请求体进行验证
    const dataToValidate = {
      ...req.body,
      ...(req.context || {})
    }
    
    const { error } = schema.validate(dataToValidate)
    
    if (error) {
      const message = error.details[0].message
      sendError(res, '400', message, 400)
      return
    }
    
    next()
  }
}

export const validateQuery = (schema: ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.query)
    
    if (error) {
      const message = error.details[0].message
      sendError(res, '400', message, 400)
      return
    }
    
    next()
  }
}

export const validateParams = (schema: ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.params)
    
    if (error) {
      const message = error.details[0].message
      sendError(res, '400', message, 400)
      return
    }
    
    next()
  }
}