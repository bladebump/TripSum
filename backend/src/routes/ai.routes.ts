import { Router } from 'express'
import { aiController } from '../controllers/ai.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validation.middleware'
import {
  parseUserInputSchema,
  addMembersSchema
} from '../validators/ai.validator'

const router = Router()

router.use(authenticate)

// 统一智能解析入口 - 所有AI功能通过此接口
router.post('/parse', validate(parseUserInputSchema), aiController.parseUserInput)

// 成员管理 - 保留，因为有特殊的批量添加逻辑
router.post('/add-members', validate(addMembersSchema), aiController.addMembers)

export default router