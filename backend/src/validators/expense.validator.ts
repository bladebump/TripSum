import Joi from 'joi'

const participantSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  shareAmount: Joi.number().positive(),
  sharePercentage: Joi.number().min(0).max(100),
}).xor('shareAmount', 'sharePercentage')

export const createExpenseSchema = Joi.object({
  amount: Joi.number().positive().required(),
  categoryId: Joi.string().uuid(),
  payerId: Joi.string().uuid().required(),
  description: Joi.string().max(500),
  expenseDate: Joi.date().required(),
  participants: Joi.array().items(participantSchema).min(1),
})

export const updateExpenseSchema = Joi.object({
  amount: Joi.number().positive(),
  categoryId: Joi.string().uuid(),
  description: Joi.string().max(500),
  expenseDate: Joi.date(),
  participants: Joi.array().items(participantSchema),
})

export const expenseQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  startDate: Joi.date(),
  endDate: Joi.date(),
  categoryId: Joi.string().uuid(),
  payerId: Joi.string().uuid(),
})

export const settlementSchema = Joi.object({
  settlements: Joi.array().items(
    Joi.object({
      fromUserId: Joi.string().uuid().required(),
      toUserId: Joi.string().uuid().required(),
      amount: Joi.number().positive().required(),
    })
  ).min(1).required(),
})