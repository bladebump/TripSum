export interface CreateTripData {
  name: string
  description?: string
  startDate: Date
  endDate?: Date
  initialFund?: number
  currency?: string
}

export interface UpdateContributionData {
  memberId: string
  contribution: number
}