import { Router } from 'express'
import { tripController } from '../controllers/trip.controller'
import { memberController } from '../controllers/member.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate, validateQuery } from '../middleware/validation.middleware'
import {
  createTripSchema,
  updateTripSchema,
  addMemberSchema,
  updateMemberRoleSchema,
  tripQuerySchema,
} from '../validators/trip.validator'
import Joi from 'joi'

const router = Router()

router.use(authenticate)

router.post('/', validate(createTripSchema), tripController.createTrip)
router.get('/', validateQuery(tripQuerySchema), tripController.getUserTrips)
router.get('/:id', tripController.getTripDetail)
router.put('/:id', validate(updateTripSchema), tripController.updateTrip)
router.delete('/:id', tripController.deleteTrip)

router.post('/:id/members', validate(addMemberSchema), tripController.addMember)
router.post('/:id/virtual-members', tripController.addVirtualMember)
router.get('/:id/members', tripController.getTripMembers)

// 基金缴纳验证规则
const batchUpdateContributionsSchema = Joi.object({
  contributions: Joi.array().items(
    Joi.object({
      memberId: Joi.string().uuid().required(),
      contribution: Joi.number().min(0).required()
    })
  ).min(1).required()
})

const updateContributionSchema = Joi.object({
  contribution: Joi.number().min(0).required()
})

// 添加基金缴纳路由 - 必须在 /:userId 路由之前
router.put('/:id/members/contributions', validate(batchUpdateContributionsSchema), memberController.batchUpdateContributions)
router.put('/:id/members/:memberId/contribution', validate(updateContributionSchema), memberController.updateContribution)

router.delete('/:id/members/:userId', tripController.removeMember)
router.put('/:id/members/:userId', validate(updateMemberRoleSchema), tripController.updateMemberRole)

export default router