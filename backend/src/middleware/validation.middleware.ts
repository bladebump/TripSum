import { Request, Response, NextFunction } from 'express'
import { ObjectSchema } from 'joi'
import { sendError } from '../utils/response'

export const validate = (schema: ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log('验证请求体:', JSON.stringify(req.body))
    const { error } = schema.validate(req.body)
    
    if (error) {
      const message = error.details[0].message
      console.error('验证失败:', message, '请求体:', req.body)
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