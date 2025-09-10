import { PrismaClient } from '@prisma/client'
import { BalanceCalculation } from './types'
import AmountUtil from '../../utils/decimal'

const prisma = new PrismaClient()

export class BalanceService {
  async calculateBalances(tripId: string): Promise<BalanceCalculation[]> {
    const [members, expenses] = await Promise.all([
      prisma.tripMember.findMany({
        where: { tripId, isActive: true },
        include: { user: true },
      }),
      prisma.expense.findMany({
        where: { tripId },
        include: {
          payerMember: {
            include: {
              user: true
            }
          },
          participants: {
            include: {
              tripMember: {
                include: {
                  user: true
                }
              }
            }
          },
        },
      }),
    ])

    const balanceMap = new Map<string, BalanceCalculation>()

    // 为所有成员创建余额记录（虚拟成员和真实成员完全一样）
    for (const member of members) {
      const memberId = member.id // 统一使用 TripMember.id 作为标识
      const username = member.isVirtual 
        ? (member.displayName || '虚拟成员')
        : (member.user?.username || 'Unknown')
      
      balanceMap.set(memberId, {
        memberId: memberId, // 统一使用memberId
        username: username,
        role: member.role, // 角色信息
        contribution: AmountUtil.toNumber(AmountUtil.toDecimal(member.contribution)), // 基金缴纳
        totalPaid: 0, // 实际垫付
        totalShare: 0, // 应该分摊
        balance: 0,
        owesTo: [],
        owedBy: [],
      })
    }

    // 处理所有支出（虚拟成员和真实成员完全一样）
    for (const expense of expenses) {
      // 只计算支出（正数），不计算收入（负数）
      if (AmountUtil.greaterThan(expense.amount, 0)) {
        // 非基金池支付计入个人垫付（所有成员包括虚拟成员都可以垫付）
        if (!expense.isPaidFromFund && expense.payerMember) {
          const payer = balanceMap.get(expense.payerMember.id)
          if (payer) {
            payer.totalPaid += AmountUtil.toNumber(AmountUtil.toDecimal(expense.amount))
          }
        }

        // 所有参与者分摊（虚拟成员和真实成员完全一样）
        for (const participant of expense.participants) {
          if (!participant.tripMemberId) continue // 跳过无效记录
          const member = balanceMap.get(participant.tripMemberId)
          if (member && participant.shareAmount) {
            member.totalShare += AmountUtil.toNumber(AmountUtil.toDecimal(participant.shareAmount))
          }
        }
      }
    }

    // 计算余额（所有成员使用相同公式）
    for (const balance of balanceMap.values()) {
      // 余额 = 基金缴纳 + 实际垫付 - 应该分摊
      balance.balance = balance.contribution + balance.totalPaid - balance.totalShare
    }

    const balances = Array.from(balanceMap.values())
    
    // 所有成员（包括虚拟成员）都参与债务关系计算
    this.calculateDebts(balances)

    return balances
  }

  private calculateDebts(balances: BalanceCalculation[]) {
    // 查找基金管理员（admin角色）
    const admin = balances.find(b => b.role === 'admin')
    
    // 创建旅程的人就是管理员，所以admin一定存在
    if (!admin) {
      throw new Error('未找到行程管理员，无法进行结算计算')
    }

    // 基金管理员中心化结算逻辑
    for (const member of balances) {
      // 跳过管理员自己
      if (member.memberId === admin.memberId) continue
      
      // 忽略小于0.01的余额（避免浮点数精度问题）
      if (Math.abs(member.balance) < 0.01) continue

      if (member.balance > 0) {
        // 成员有余额，管理员需要退款给成员
        const amount = Math.round(member.balance * 100) / 100
        
        admin.owesTo.push({
          memberId: member.memberId,
          username: member.username,
          amount: amount,
        })

        member.owedBy.push({
          memberId: admin.memberId,
          username: admin.username,
          amount: amount,
        })
      } else if (member.balance < 0) {
        // 成员欠款，需要补缴给管理员
        const amount = Math.round(Math.abs(member.balance) * 100) / 100
        
        member.owesTo.push({
          memberId: admin.memberId,
          username: admin.username,
          amount: amount,
        })

        admin.owedBy.push({
          memberId: member.memberId,
          username: member.username,
          amount: amount,
        })
      }
    }
  }
}

export const balanceService = new BalanceService()