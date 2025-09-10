import { Router } from 'express'
import authRoutes from './auth.routes'
import tripRoutes from './trip.routes'
import userRoutes from './user.routes'
import invitationRoutes from './invitation.routes'
import messageRoutes from './message.routes'
import { authenticate } from '../middleware/auth.middleware'
import { requireAdmin } from '../middleware/permission.middleware'
import { setupTripContext, setupExpenseContext } from '../middleware/context.middleware'
import { expenseController } from '../controllers/expense.controller'
import { calculationController } from '../controllers/calculation.controller'
import { aiController } from '../controllers/ai.controller'
import { invitationController } from '../controllers/invitation.controller'
import { messageController } from '../controllers/message.controller'
import { validate, validateQuery } from '../middleware/validation.middleware'
import { expenseQuerySchema } from '../validators/expense.validator'
import { createInvitationSchema, tripInvitationQuerySchema } from '../validators/invitation.validator'
import { messagePreferencesSchema } from '../validators/message.validator'
import { parseUserInputSchema, addMembersSchema } from '../validators/ai.validator'
import { upload } from '../middleware/upload.middleware'

const router = Router()

router.use('/auth', authRoutes)
router.use('/trips', tripRoutes)
router.use('/users', userRoutes)
router.use('/invitations', invitationRoutes)
router.use('/messages', messageRoutes)

// Expense routes
router.post('/trips/:tripId/expenses', authenticate, setupTripContext, requireAdmin, upload.single('receipt'), expenseController.createExpense)
router.get('/trips/:tripId/expenses', authenticate, setupTripContext, validateQuery(expenseQuerySchema), expenseController.getTripExpenses)
router.put('/trips/:tripId/expenses/:expenseId', authenticate, setupTripContext, setupExpenseContext, requireAdmin, upload.single('receipt'), expenseController.updateExpense)
router.delete('/trips/:tripId/expenses/:expenseId', authenticate, setupTripContext, setupExpenseContext, requireAdmin, expenseController.deleteExpense)

// Statistics and calculation routes
router.get('/trips/:tripId/statistics', authenticate, setupTripContext, calculationController.getStatistics)
router.get('/trips/:tripId/balances', authenticate, setupTripContext, calculationController.getBalances)
router.post('/trips/:tripId/calculate', authenticate, setupTripContext, calculationController.calculateSettlement)
router.post('/trips/:tripId/settle', authenticate, setupTripContext, calculationController.createSettlements)

// AI routes
router.post('/trips/:tripId/ai/parse', authenticate, setupTripContext, requireAdmin, validate(parseUserInputSchema), aiController.parseUserInput)
router.post('/trips/:tripId/ai/members', authenticate, setupTripContext, requireAdmin, validate(addMembersSchema), aiController.addMembers)
router.get('/trips/:tripId/summary', authenticate, setupTripContext, aiController.generateTripSummary)
router.get('/trips/:tripId/summary/export', authenticate, setupTripContext, aiController.exportTripSummary)

// Invitation routes
router.post('/trips/:tripId/invitations', authenticate, setupTripContext, requireAdmin, validate(createInvitationSchema), invitationController.sendInvitation)
router.get('/trips/:tripId/invitations', authenticate, setupTripContext, requireAdmin, validateQuery(tripInvitationQuerySchema), invitationController.getTripInvitations)

// Message preferences routes
router.get('/message-preferences', authenticate, messageController.getPreferences)
router.put('/message-preferences', authenticate, validate(messagePreferencesSchema), messageController.updatePreferences)

export default router