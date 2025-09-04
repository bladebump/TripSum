import { Expense } from '@/types'
import AmountUtil from './decimal'

export const calculateTotalExpenses = (expenses: Expense[]): number => {
  return AmountUtil.sum(expenses.map(e => e.amount))
}

export const calculateAveragePerPerson = (totalAmount: number, memberCount: number): number => {
  if (memberCount === 0) return 0
  return AmountUtil.divide(totalAmount, memberCount)
}

export const calculateUserBalance = (
  memberId: string,  // 改为使用memberId
  expenses: Expense[],
  memberCount: number
): number => {
  const totalPaid = AmountUtil.sum(
    expenses
      .filter(expense => expense.payerMemberId === memberId)  // 使用payerMemberId
      .map(e => e.amount)
  )

  const totalShare = expenses.reduce((sum, expense) => {
    const participant = expense.participants?.find(p => p.tripMemberId === memberId)  // 使用tripMemberId
    if (participant?.shareAmount) {
      return AmountUtil.add(sum, participant.shareAmount)
    }
    if (participant?.sharePercentage) {
      return AmountUtil.add(sum, AmountUtil.divide(AmountUtil.multiply(expense.amount, participant.sharePercentage), 100))
    }
    // 默认平均分摊
    if (expense.participants && expense.participants.length > 0) {
      return AmountUtil.add(sum, AmountUtil.divide(expense.amount, expense.participants.length))
    }
    return AmountUtil.add(sum, AmountUtil.divide(expense.amount, memberCount))
  }, 0)

  return AmountUtil.subtract(totalPaid, totalShare)
}

export const groupExpensesByDate = (expenses: Expense[]): Map<string, Expense[]> => {
  const grouped = new Map<string, Expense[]>()
  
  expenses.forEach(expense => {
    const date = expense.expenseDate.split('T')[0]
    const existing = grouped.get(date) || []
    grouped.set(date, [...existing, expense])
  })
  
  return grouped
}

export const groupExpensesByCategory = (expenses: Expense[]): Map<string, {
  name: string
  amount: number
  count: number
  percentage: number
}> => {
  const grouped = new Map()
  const total = calculateTotalExpenses(expenses)
  
  expenses.forEach(expense => {
    const categoryId = expense.categoryId || 'uncategorized'
    const categoryName = expense.category?.name || '未分类'
    const existing = grouped.get(categoryId) || { name: categoryName, amount: 0, count: 0, percentage: 0 }
    
    existing.amount += expense.amount
    existing.count += 1
    existing.percentage = (existing.amount / total) * 100
    
    grouped.set(categoryId, existing)
  })
  
  return grouped
}

export const validateParticipants = (
  participants: Array<{ shareAmount?: number; sharePercentage?: number }>,
  totalAmount: number
): { valid: boolean; message?: string } => {
  if (!participants || participants.length === 0) {
    return { valid: true }
  }

  const hasAmount = participants.some(p => p.shareAmount !== undefined)
  const hasPercentage = participants.some(p => p.sharePercentage !== undefined)

  if (hasAmount && hasPercentage) {
    return { valid: false, message: '不能同时使用金额和百分比分摊' }
  }

  if (hasAmount) {
    const totalShare = participants.reduce((sum, p) => sum + (p.shareAmount || 0), 0)
    if (Math.abs(totalShare - totalAmount) > 0.01) {
      return { valid: false, message: `分摊金额总和(${totalShare})必须等于支出金额(${totalAmount})` }
    }
  }

  if (hasPercentage) {
    const totalPercentage = participants.reduce((sum, p) => sum + (p.sharePercentage || 0), 0)
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return { valid: false, message: `分摊百分比总和必须等于100%，当前为${totalPercentage}%` }
    }
  }

  return { valid: true }
}

export const calculateOptimalSettlements = (
  balances: Array<{ memberId: string; balance: number }>  // 改为使用memberId
): Array<{ from: string; to: string; amount: number }> => {
  const settlements: Array<{ from: string; to: string; amount: number }> = []
  
  const creditors = balances
    .filter(b => b.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .map(b => ({ ...b }))
  
  const debtors = balances
    .filter(b => b.balance < 0)
    .sort((a, b) => a.balance - b.balance)
    .map(b => ({ ...b, balance: Math.abs(b.balance) }))

  for (const debtor of debtors) {
    let remainingDebt = debtor.balance

    for (const creditor of creditors) {
      if (remainingDebt <= 0.01) break
      if (creditor.balance <= 0.01) continue

      const amount = Math.min(remainingDebt, creditor.balance)
      
      settlements.push({
        from: debtor.memberId,  // 使用memberId
        to: creditor.memberId,    // 使用memberId
        amount: Math.round(amount * 100) / 100,
      })

      creditor.balance -= amount
      remainingDebt -= amount
    }
  }

  return settlements
}