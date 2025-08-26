import { Router } from 'express'
import { aiController } from '../controllers/ai.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.use(authenticate)

router.post('/parse-expense', aiController.parseExpense)
router.post('/categorize', aiController.categorize)
router.post('/suggest-split', aiController.suggestSplit)

export default router