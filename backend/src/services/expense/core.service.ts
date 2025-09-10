import { expenseCrudService } from './crud.service'
import { expenseQueryService } from './query.service'

export class ExpenseService {
  // CRUD service delegation
  createExpense = expenseCrudService.createExpense.bind(expenseCrudService)
  updateExpense = expenseCrudService.updateExpense.bind(expenseCrudService)
  deleteExpense = expenseCrudService.deleteExpense.bind(expenseCrudService)
  
  // Query service delegation
  getTripExpenses = expenseQueryService.getTripExpenses.bind(expenseQueryService)
  getExpenseDetail = expenseQueryService.getExpenseDetail.bind(expenseQueryService)
  getExpensesByCategory = expenseQueryService.getExpensesByCategory.bind(expenseQueryService)
  getExpensesByPayer = expenseQueryService.getExpensesByPayer.bind(expenseQueryService)
  
  // Validation and participant services are used internally by the delegated services
}

export const expenseService = new ExpenseService()