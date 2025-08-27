import { Router } from 'express'
import { tripController } from '../controllers/trip.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate, validateQuery } from '../middleware/validation.middleware'
import {
  createTripSchema,
  updateTripSchema,
  addMemberSchema,
  updateMemberRoleSchema,
  tripQuerySchema,
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
router.delete('/:id/members/:userId', tripController.removeMember)
router.put('/:id/members/:userId', validate(updateMemberRoleSchema), tripController.updateMemberRole)

export default router