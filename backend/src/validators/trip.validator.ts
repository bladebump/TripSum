import Joi from 'joi'

export const createTripSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500),
  startDate: Joi.date().required(),
  endDate: Joi.date().min(Joi.ref('startDate')),
  initialFund: Joi.number().min(0).default(0),
  currency: Joi.string().length(3).default('CNY'),
})

export const updateTripSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  description: Joi.string().max(500),
  endDate: Joi.date(),
})

export const addMemberSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  role: Joi.string().valid('admin', 'member').default('member'),
})

export const updateMemberRoleSchema = Joi.object({
  role: Joi.string().valid('admin', 'member').required(),
})

export const tripQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid('active', 'completed', 'all').default('all'),
})

export const updateContributionSchema = Joi.object({
  contribution: Joi.number().min(0).required(),
})

export const batchUpdateContributionsSchema = Joi.object({
  contributions: Joi.array().items(
    Joi.object({
      memberId: Joi.string().uuid().required(),
      contribution: Joi.number().min(0).required(),
    })
  ).min(1).required(),
})