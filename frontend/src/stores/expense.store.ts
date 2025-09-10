import { create } from 'zustand'
import { Expense, CreateExpenseData, BalanceCalculation, SettlementSummary } from '@/types'
import expenseService from '@/services/expense.service'

interface ExpenseState {
  expenses: Expense[]
  balances: BalanceCalculation[]
  settlementSummary: SettlementSummary | null
  loading: boolean
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  setExpenses: (expenses: Expense[]) => void
  setBalances: (balances: BalanceCalculation[]) => void
  setSettlementSummary: (summary: SettlementSummary | null) => void
  setLoading: (loading: boolean) => void
  setPagination: (pagination: any) => void
  fetchExpenses: (tripId: string, params?: any) => Promise<void>
  createExpense: (tripId: string, data: CreateExpenseData, receipt?: File) => Promise<void>
  updateExpense: (tripId: string, expenseId: string, data: Partial<CreateExpenseData>, receipt?: File) => Promise<void>
  deleteExpense: (tripId: string, expenseId: string) => Promise<void>
  fetchBalances: (tripId: string) => Promise<void>
  calculateSettlement: (tripId: string) => Promise<void>
  createSettlements: (tripId: string, settlements: any[]) => Promise<void>
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  balances: [],
  settlementSummary: null,
  loading: false,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },

  setExpenses: (expenses) => set({ expenses }),
  setBalances: (balances) => set({ balances }),
  setSettlementSummary: (settlementSummary) => set({ settlementSummary }),
  setLoading: (loading) => set({ loading }),
  setPagination: (pagination) => set({ pagination }),

  fetchExpenses: async (tripId, params) => {
    set({ loading: true })
    try {
      const response = await expenseService.getTripExpenses(tripId, params)
      set({ 
        expenses: response.expenses, 
        pagination: response.pagination, 
        loading: false 
      })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  createExpense: async (tripId, data, receipt) => {
    set({ loading: true })
    try {
      const expense = await expenseService.createExpense(tripId, data, receipt)
      const { expenses } = get()
      set({ 
        expenses: [expense, ...expenses], 
        loading: false 
      })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  updateExpense: async (tripId, expenseId, data, receipt) => {
    set({ loading: true })
    try {
      const updatedExpense = await expenseService.updateExpense(tripId, expenseId, data, receipt)
      const { expenses } = get()
      set({
        expenses: expenses.map(e => e.id === expenseId ? updatedExpense : e),
        loading: false
      })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  deleteExpense: async (tripId, expenseId) => {
    set({ loading: true })
    try {
      await expenseService.deleteExpense(tripId, expenseId)
      const { expenses } = get()
      set({
        expenses: expenses.filter(e => e.id !== expenseId),
        loading: false
      })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  fetchBalances: async (tripId) => {
    set({ loading: true })
    try {
      const balances = await expenseService.getBalances(tripId)
      set({ balances, loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  calculateSettlement: async (tripId) => {
    set({ loading: true })
    try {
      const summary = await expenseService.calculateSettlement(tripId)
      set({ settlementSummary: summary, loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  createSettlements: async (tripId, settlements) => {
    set({ loading: true })
    try {
      await expenseService.createSettlements(tripId, settlements)
      set({ loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },
}))