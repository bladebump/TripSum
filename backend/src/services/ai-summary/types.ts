export interface TripSummaryResult {
  summary: string
  insights: ConsumptionInsight[]
  recommendations: string[]
  highlights: TripHighlight[]
  warnings: string[]
  nextTripAdvice: string[]
  generatedAt: Date
}

export interface ConsumptionInsight {
  type: 'pattern' | 'anomaly' | 'trend' | 'comparison'
  title: string
  description: string
  severity?: 'info' | 'warning' | 'critical'
  data?: any
}

export interface TripHighlight {
  type: 'achievement' | 'milestone' | 'memory'
  title: string
  description: string
  emoji?: string
}