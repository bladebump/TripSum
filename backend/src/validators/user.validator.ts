import Joi from 'joi';

export const searchUsersSchema = Joi.object({
  keyword: Joi.string().min(1).max(50).required(),
  tripId: Joi.string().uuid().optional(),
  limit: Joi.number().integer().min(1).max(50).default(10),
});