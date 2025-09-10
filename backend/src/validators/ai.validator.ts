import Joi from 'joi'

export const parseUserInputSchema = Joi.object({
  text: Joi.string().min(1).max(500).required(),
  members: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      isVirtual: Joi.boolean().optional(),
      userId: Joi.string().allow(null).optional(),
      displayName: Joi.string().optional(),
      role: Joi.string().valid('admin', 'member').optional(),
      user: Joi.object({
        username: Joi.string()
      }).optional()
    })
  ).optional()
})

export const addMembersSchema = Joi.object({
  memberNames: Joi.array().items(
    Joi.string().min(1).max(20).required()
  ).min(1).max(10).required(),
})

// 其他AI schema已被 parseUserInputSchema 统一替代