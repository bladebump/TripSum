import Joi from 'joi'

export const parseUserInputSchema = Joi.object({
  tripId: Joi.string().uuid().required(),
  text: Joi.string().min(1).max(500).required(),
  members: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      isVirtual: Joi.boolean().optional(),
      userId: Joi.string().allow(null).optional(),
      displayName: Joi.string().optional(),
      user: Joi.object({
        username: Joi.string()
      }).optional()
    })
  ).optional()
})

export const parseMembersSchema = Joi.object({
  tripId: Joi.string().uuid().required(),
  text: Joi.string().min(1).max(500).required(),
})

export const addMembersSchema = Joi.object({
  tripId: Joi.string().uuid().required(),
  memberNames: Joi.array().items(
    Joi.string().min(1).max(20).required()
  ).min(1).max(10).required(),
})

export const parseExpenseSchema = Joi.object({
  tripId: Joi.string().uuid().required(),
  description: Joi.string().min(1).max(500).required(),
})

export const categorizeSchema = Joi.object({
  description: Joi.string().min(1).max(500).required(),
})

export const suggestSplitSchema = Joi.object({
  tripId: Joi.string().uuid().required(),
  amount: Joi.number().positive().required(),
  description: Joi.string().min(1).max(500).required(),
})