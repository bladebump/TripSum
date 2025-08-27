import { Router } from 'express'
import { aiController } from '../controllers/ai.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validation.middleware'
import {
  parseUserInputSchema,
  parseMembersSchema,
  addMembersSchema,
  parseExpenseSchema,
  categorizeSchema,
  suggestSplitSchema
} from '../validators/ai.validator'

const router = Router()

router.use(authenticate)

// 统一智能解析入口
router.post('/parse', validate(parseUserInputSchema), aiController.parseUserInput)

// 专门的解析接口
router.post('/parse-expense', validate(parseExpenseSchema), aiController.parseExpense)
router.post('/parse-members', validate(parseMembersSchema), aiController.parseMembers)

// 成员管理
router.post('/add-members', validate(addMembersSchema), aiController.addMembers)

// 其他AI功能
router.post('/categorize', validate(categorizeSchema), aiController.categorize)
router.post('/suggest-split', validate(suggestSplitSchema), aiController.suggestSplit)

export default router