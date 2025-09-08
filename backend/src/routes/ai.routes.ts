import { Router } from 'express'
import { aiController } from '../controllers/ai.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requireAdmin } from '../middleware/permission.middleware'
import { validate } from '../middleware/validation.middleware'
import {
  parseUserInputSchema,
  addMembersSchema
} from '../validators/ai.validator'

const router = Router()

router.use(authenticate)

// AI解析 - 仅管理员（主要用于记账）
router.post('/parse', requireAdmin, validate(parseUserInputSchema), aiController.parseUserInput)

// 成员管理 - 仅管理员
router.post('/add-members', requireAdmin, validate(addMembersSchema), aiController.addMembers)

export default router