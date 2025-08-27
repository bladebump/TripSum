import api from './api'
import { TripMember } from '@/types'

export interface ContributionUpdate {
  memberId: string
  contribution: number
}

class MemberService {
  // 获取行程成员列表
  async getTripMembers(tripId: string): Promise<TripMember[]> {
    const response = await api.get(`/trips/${tripId}/members`)
    return response.data
  }

  // 更新单个成员的基金缴纳
  async updateContribution(
    tripId: string, 
    memberId: string, 
    contribution: number
  ) {
    const response = await api.put(
      `/trips/${tripId}/members/${memberId}/contribution`,
      { contribution }
    )
    return response.data
  }

  // 批量更新成员的基金缴纳
  async batchUpdateContributions(
    tripId: string,
    contributions: ContributionUpdate[]
  ) {
    const response = await api.put(
      `/trips/${tripId}/members/contributions`,
      { contributions }
    )
    return response.data
  }
}

export const memberService = new MemberService()