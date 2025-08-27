import api from './api'
import { 
  ApiResponse, 
  Expense, 
  CreateExpenseData, 
  BalanceCalculation, 
  SettlementSummary
} from '@/types'
import { transformExpenseData, transformBalanceData, transformSettlementData } from '@/utils/dataTransform'

class ExpenseService {
  async createExpense(tripId: string, expenseData: CreateExpenseData, receipt?: File): Promise<Expense> {
    if (receipt) {
      const { data } = await api.uploadFile<ApiResponse<Expense>>(
        `/trips/${tripId}/expenses`,
        receipt,
        expenseData
      )
      if (data.success && data.data) {
        return transformExpenseData(data.data)
      }
    } else {
      const { data } = await api.post<ApiResponse<Expense>>(`/trips/${tripId}/expenses`, expenseData)
      if (data.success && data.data) {
        return transformExpenseData(data.data)
      }
    }
    throw new Error('创建支出失败')
  }

  async getTripExpenses(tripId: string, params?: {
    page?: number
    limit?: number
    startDate?: string
    endDate?: string
    categoryId?: string
    payerId?: string
  }): Promise<{ expenses: Expense[]; pagination: any }> {
    const { data } = await api.get<ApiResponse<{ expenses: Expense[]; pagination: any }>>(
      `/trips/${tripId}/expenses`,
      { params }
    )
    if (data.success && data.data) {
      return {
        expenses: data.data.expenses.map(expense => transformExpenseData(expense)),
        pagination: data.data.pagination
      }
    }
    throw new Error('获取支出列表失败')
  }

  async getExpenseDetail(expenseId: string): Promise<Expense> {
    const { data } = await api.get<ApiResponse<Expense>>(`/expenses/${expenseId}`)
    if (data.success && data.data) {
      return transformExpenseData(data.data)
    }
    throw new Error('获取支出详情失败')
  }

  async updateExpense(expenseId: string, expenseData: Partial<CreateExpenseData>, receipt?: File): Promise<Expense> {
    if (receipt) {
      const { data } = await api.uploadFile<ApiResponse<Expense>>(
        `/expenses/${expenseId}`,
        receipt,
        expenseData
      )
      if (data.success && data.data) {
        return transformExpenseData(data.data)
      }
    } else {
      const { data } = await api.put<ApiResponse<Expense>>(`/expenses/${expenseId}`, expenseData)
      if (data.success && data.data) {
        return transformExpenseData(data.data)
      }
    }
    throw new Error('更新支出失败')
  }

  async deleteExpense(expenseId: string): Promise<void> {
    const { data } = await api.delete<ApiResponse>(`/expenses/${expenseId}`)
    if (!data.success) {
      throw new Error('删除支出失败')
    }
  }

  async getBalances(tripId: string): Promise<BalanceCalculation[]> {
    const { data } = await api.get<ApiResponse<BalanceCalculation[]>>(`/trips/${tripId}/balances`)
    if (data.success && data.data) {
      return data.data.map(balance => transformBalanceData(balance))
    }
    throw new Error('获取余额信息失败')
  }

  async calculateSettlement(tripId: string): Promise<SettlementSummary> {
    const { data } = await api.post<ApiResponse<SettlementSummary>>(`/trips/${tripId}/calculate`)
    if (data.success && data.data) {
      return transformSettlementData(data.data)
    }
    throw new Error('计算结算方案失败')
  }

  async createSettlements(tripId: string, settlements: Array<{
    fromUserId: string
    toUserId: string
    amount: number
  }>): Promise<void> {
    const { data } = await api.post<ApiResponse>(`/trips/${tripId}/settle`, { settlements })
    if (!data.success) {
      throw new Error('创建结算失败')
    }
  }
}

export default new ExpenseService()