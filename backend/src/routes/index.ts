import { Router } from 'express'
import authRoutes from './auth.routes'
import tripRoutes from './trip.routes'
import expenseRoutes from './expense.routes'
import aiRoutes from './ai.routes'
import { authenticate } from '../middleware/auth.middleware'
import { expenseController } from '../controllers/expense.controller'
import { calculationController } from '../controllers/calculation.controller'
import { validateQuery } from '../middleware/validation.middleware'
import { expenseQuerySchema } from '../validators/expense.validator'
import { upload } from '../middleware/upload.middleware'

const router = Router()

router.use('/auth', authRoutes)
router.use('/trips', tripRoutes)
router.use('/expenses', expenseRoutes)
router.use('/ai', aiRoutes)

// Trip-specific expense routes
router.post('/trips/:id/expenses', authenticate, upload.single('receipt'), expenseController.createExpense)
router.get('/trips/:id/expenses', authenticate, validateQuery(expenseQuerySchema), expenseController.getTripExpenses)

// Statistics and calculation routes
router.get('/trips/:id/statistics', authenticate, calculationController.getStatistics)
router.get('/trips/:id/balances', authenticate, calculationController.getBalances)
router.post('/trips/:id/calculate', authenticate, calculationController.calculateSettlement)
router.post('/trips/:id/settle', authenticate, calculationController.createSettlements)

export default router