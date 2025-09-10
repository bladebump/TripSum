import { invitationCreateService } from './create.service'
import { invitationProcessService } from './process.service'
import { invitationQueryService } from './query.service'

export class InvitationService {
  // Create service delegation
  createInvitation = invitationCreateService.createInvitation.bind(invitationCreateService)
  cancelInvitation = invitationCreateService.cancelInvitation.bind(invitationCreateService)
  
  // Process service delegation
  acceptInvitation = invitationProcessService.acceptInvitation.bind(invitationProcessService)
  rejectInvitation = invitationProcessService.rejectInvitation.bind(invitationProcessService)
  updateExpiredInvitations = invitationProcessService.updateExpiredInvitations.bind(invitationProcessService)
  
  // Query service delegation
  getUserInvitations = invitationQueryService.getUserInvitations.bind(invitationQueryService)
  getInvitationById = invitationQueryService.getInvitationById.bind(invitationQueryService)
  getTripInvitations = invitationQueryService.getTripInvitations.bind(invitationQueryService)
  getPendingInvitationsCount = invitationQueryService.getPendingInvitationsCount.bind(invitationQueryService)
  checkUserHasPendingInvitation = invitationQueryService.checkUserHasPendingInvitation.bind(invitationQueryService)
}

export const invitationService = new InvitationService()