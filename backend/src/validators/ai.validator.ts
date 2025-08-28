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

export const addMembersSchema = Joi.object({
  tripId: Joi.string().uuid().required(),
  memberNames: Joi.array().items(
    Joi.string().min(1).max(20).required()
  ).min(1).max(10).required(),
})

// 其他AI schema已被 parseUserInputSchema 统一替代