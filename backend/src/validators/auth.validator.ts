import Joi from 'joi'

export const registerSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
})

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
})

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
})

export const updateProfileSchema = Joi.object({
  username: Joi.string().min(3).max(50),
  avatarUrl: Joi.string().uri(),
})