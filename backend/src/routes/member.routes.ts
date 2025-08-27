import { Router } from 'express'
import { memberController } from '../controllers/member.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validation.middleware'
import Joi from 'joi'

const router = Router()

router.use(authenticate)

// 验证规则
const updateContributionSchema = Joi.object({
  contribution: Joi.number().min(0).required()
})

const batchUpdateSchema = Joi.object({
  contributions: Joi.array().items(
    Joi.object({
      memberId: Joi.string().uuid().required(),
      contribution: Joi.number().min(0).required()
    })
  ).min(1).required()
})

// 路由
router.get('/trips/:tripId/members', memberController.getMembers)
router.put('/trips/:tripId/members/:memberId/contribution', 
  validate(updateContributionSchema), 
  memberController.updateContribution
)
router.put('/trips/:tripId/members/contributions', 
  validate(batchUpdateSchema), 
  memberController.batchUpdateContributions
)

export default router