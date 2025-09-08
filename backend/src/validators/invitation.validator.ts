import Joi from 'joi';
import { InviteType, InvitationStatus } from '@prisma/client';

export const createInvitationSchema = Joi.object({
  invitedUserId: Joi.string().uuid().required(),
  inviteType: Joi.string()
    .valid(...Object.values(InviteType))
    .required(),
  targetMemberId: Joi.when('inviteType', {
    is: InviteType.REPLACE,
    then: Joi.string().uuid().required(),
    otherwise: Joi.string().uuid().optional(),
  }),
  message: Joi.string().max(500).optional(),
});

export const invitationListQuerySchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(InvitationStatus))
    .optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

export const tripInvitationQuerySchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(InvitationStatus))
    .optional(),
});