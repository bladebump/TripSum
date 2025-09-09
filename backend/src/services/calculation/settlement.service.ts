import { PrismaClient } from '@prisma/client'
import { Settlement } from './types'
import { balanceService } from './balance.service'

const prisma = new PrismaClient()

export class SettlementService {
  async calculateSettlement(tripId: string): Promise<Settlement[]> {
    const balances = await balanceService.calculateBalances(tripId)
    const settlements: Settlement[] = []

    for (const balance of balances) {
      for (const debt of balance.owesTo) {
        settlements.push({
          from: {
            memberId: balance.memberId,  // 直接使用memberId
            username: balance.username,
          },
          to: {
            memberId: debt.memberId,     // 直接使用memberId
            username: debt.username,
          },
          amount: debt.amount,
        })
      }
    }

    return settlements
  }

  async createSettlements(tripId: string, settlements: Array<{
    fromMemberId: string
    toMemberId: string
    amount: number
  }>) {
    const createdSettlements = await prisma.settlement.createMany({
      data: settlements.map((s) => ({
        tripId,
        fromMemberId: s.fromMemberId,
        toMemberId: s.toMemberId,
        amount: s.amount,
      })),
    })

    return createdSettlements
  }

  async markSettlementAsPaid(settlementId: string) {
    const settlement = await prisma.settlement.update({
      where: { id: settlementId },
      data: {
        isSettled: true,
        settledAt: new Date(),
      },
    })

    return settlement
  }

  async getSettlementHistory(tripId: string) {
    const settlements = await prisma.settlement.findMany({
      where: { tripId },
      include: {
        fromMember: {
          include: { user: true }
        },
        toMember: {
          include: { user: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return settlements.map(s => ({
      id: s.id,
      from: {
        memberId: s.fromMemberId,
        username: s.fromMember.isVirtual 
          ? s.fromMember.displayName 
          : s.fromMember.user?.username
      },
      to: {
        memberId: s.toMemberId,
        username: s.toMember.isVirtual 
          ? s.toMember.displayName 
          : s.toMember.user?.username
      },
      amount: s.amount,
      isSettled: s.isSettled,
      settledAt: s.settledAt,
      createdAt: s.createdAt
    }))
  }

  async getUnsettledDebts(tripId: string) {
    const settlements = await prisma.settlement.findMany({
      where: { 
        tripId,
        isSettled: false 
      },
      include: {
        fromMember: {
          include: { user: true }
        },
        toMember: {
          include: { user: true }
        }
      }
    })

    return settlements
  }
}

export const settlementService = new SettlementService()