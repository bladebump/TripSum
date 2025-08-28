import api from './api'

export interface ContributionUpdate {
  memberId: string
  contribution: number
}

export interface BatchContributionRequest {
  contributions: ContributionUpdate[]
}

class ContributionService {
  async updateMemberContribution(tripId: string, memberId: string, contribution: number) {
    const response = await api.put(`/trips/${tripId}/members/${memberId}/contribution`, {
      contribution
    })
    return response.data
  }

  async batchUpdateContributions(tripId: string, contributions: ContributionUpdate[]) {
    const response = await api.patch(`/trips/${tripId}/contributions`, {
      contributions
    })
    return response.data
  }
}

export default new ContributionService()