import { balanceService } from './balance.service'
import { settlementService } from './settlement.service'
import { statisticsService } from './statistics.service'

export class CalculationService {
  // Balance service delegation
  calculateBalances = balanceService.calculateBalances.bind(balanceService)
  
  // Settlement service delegation
  calculateSettlement = settlementService.calculateSettlement.bind(settlementService)
  createSettlements = settlementService.createSettlements.bind(settlementService)
  markSettlementAsPaid = settlementService.markSettlementAsPaid.bind(settlementService)
  
  // Statistics service delegation
  getTripStatistics = statisticsService.getTripStatistics.bind(statisticsService)
}

export const calculationService = new CalculationService()