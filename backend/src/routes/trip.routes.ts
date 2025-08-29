import { Router } from 'express'
import { tripController } from '../controllers/trip.controller'
// memberController已删除，使用tripController处理所有成员相关操作
import { authenticate } from '../middleware/auth.middleware'
import { validate, validateQuery } from '../middleware/validation.middleware'
import {
  createTripSchema,
  updateTripSchema,
  addMemberSchema,
  updateMemberRoleSchema,
  tripQuerySchema,
  updateContributionSchema,
  batchUpdateContributionsSchema,
} from '../validators/trip.validator'

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

// 基金缴纳功能API
router.put('/:id/members/:memberId/contribution', validate(updateContributionSchema), tripController.updateMemberContribution)
router.patch('/:id/contributions', validate(batchUpdateContributionsSchema), tripController.batchUpdateContributions)

router.delete('/:id/members/:memberId', tripController.removeMember)
router.put('/:id/members/:memberId', validate(updateMemberRoleSchema), tripController.updateMemberRole)

export default router