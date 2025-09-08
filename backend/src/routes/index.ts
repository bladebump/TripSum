import { Router } from 'express'
import authRoutes from './auth.routes'
import tripRoutes from './trip.routes'
import expenseRoutes from './expense.routes'
import aiRoutes from './ai.routes'
import userRoutes from './user.routes'
import invitationRoutes from './invitation.routes'
import messageRoutes from './message.routes'
import { authenticate } from '../middleware/auth.middleware'
import { requireAdmin } from '../middleware/permission.middleware'
import { expenseController } from '../controllers/expense.controller'
import { calculationController } from '../controllers/calculation.controller'
import { aiController } from '../controllers/ai.controller'
import { invitationController } from '../controllers/invitation.controller'
import { messageController } from '../controllers/message.controller'
import { validate, validateQuery } from '../middleware/validation.middleware'
import { expenseQuerySchema } from '../validators/expense.validator'
import { createInvitationSchema, tripInvitationQuerySchema } from '../validators/invitation.validator'
import { messagePreferencesSchema } from '../validators/message.validator'
import { upload } from '../middleware/upload.middleware'

const router = Router()

router.use('/auth', authRoutes)
router.use('/trips', tripRoutes)
router.use('/expenses', expenseRoutes)
router.use('/ai', aiRoutes)
router.use('/users', userRoutes)
router.use('/invitations', invitationRoutes)
router.use('/messages', messageRoutes)

// Trip-specific expense routes
// 创建费用 - 仅管理员
router.post('/trips/:id/expenses', authenticate, requireAdmin, upload.single('receipt'), expenseController.createExpense)
// 查看费用列表 - 所有成员可访问
router.get('/trips/:id/expenses', authenticate, validateQuery(expenseQuerySchema), expenseController.getTripExpenses)

// Statistics and calculation routes
router.get('/trips/:id/statistics', authenticate, calculationController.getStatistics)
router.get('/trips/:id/balances', authenticate, calculationController.getBalances)
router.post('/trips/:id/calculate', authenticate, calculationController.calculateSettlement)
router.post('/trips/:id/settle', authenticate, calculationController.createSettlements)

// AI Summary routes
router.get('/trips/:id/summary', authenticate, aiController.generateTripSummary)
router.get('/trips/:id/summary/export', authenticate, aiController.exportTripSummary)

// Trip invitation routes
router.post('/trips/:id/invitations', authenticate, requireAdmin, validate(createInvitationSchema), invitationController.sendInvitation)
router.get('/trips/:id/invitations', authenticate, requireAdmin, validateQuery(tripInvitationQuerySchema), invitationController.getTripInvitations)

// Message preferences routes
router.get('/message-preferences', authenticate, messageController.getPreferences)
router.put('/message-preferences', authenticate, validate(messagePreferencesSchema), messageController.updatePreferences)

export default router