import request from 'supertest'
import { PrismaClient, InviteType, InvitationStatus } from '@prisma/client'
import { app } from '../../src/app'
import { TestFactories } from '../factories'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const factories = new TestFactories(prisma)

describe('Invitation System Integration Tests', () => {
  let adminToken: string
  let memberToken: string
  let adminUser: any
  let memberUser: any
  let inviteeUser: any
  let testTrip: any
  let virtualMember: any

  beforeAll(async () => {
    // Clean up test data
    await factories.cleanupAll()

    // Create test users
    adminUser = await factories.user.create({
      username: 'test_admin',
      email: 'admin@test.com',
    })

    memberUser = await factories.user.create({
      username: 'test_member',
      email: 'member@test.com',
    })

    inviteeUser = await factories.user.create({
      username: 'test_invitee',
      email: 'invitee@test.com',
    })

    // Generate tokens
    adminToken = jwt.sign(
      { userId: adminUser.id, email: adminUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    )

    memberToken = jwt.sign(
      { userId: memberUser.id, email: memberUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    )

    // Create test trip with admin and member
    testTrip = await prisma.trip.create({
      data: {
        name: 'Test Trip for Invitation',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        currency: 'CNY',
        creator: {
          connect: { id: adminUser.id }
        },
        members: {
          create: [
            {
              userId: adminUser.id,
              displayName: adminUser.username,
              role: 'admin',
              isVirtual: false,
            },
            {
              userId: memberUser.id,
              displayName: memberUser.username,
              role: 'member',
              isVirtual: false,
            },
            {
              displayName: 'Virtual Member',
              role: 'member',
              isVirtual: true,
            }
          ]
        }
      },
      include: {
        members: true
      }
    })

    virtualMember = testTrip.members.find((m: any) => m.isVirtual)
  })

  afterAll(async () => {
    await factories.cleanupAll()
    await prisma.$disconnect()
  })

  describe('POST /api/trips/:id/invitations', () => {
    it('should allow admin to send invitation', async () => {
      const response = await request(app)
        .post(`/api/trips/${testTrip.id}/invitations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          inviteeId: inviteeUser.id,
          inviteType: InviteType.ADD,
          message: 'Welcome to our trip!',
        })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe('200')
      expect(response.body.data).toHaveProperty('id')
      expect(response.body.data.inviteType).toBe(InviteType.ADD)
      expect(response.body.data.status).toBe(InvitationStatus.PENDING)
    })

    it('should allow admin to send replace invitation', async () => {
      const response = await request(app)
        .post(`/api/trips/${testTrip.id}/invitations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          inviteeId: inviteeUser.id,
          inviteType: InviteType.REPLACE,
          targetMemberId: virtualMember.id,
          message: 'Please replace our virtual member',
        })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe('200')
      expect(response.body.data.inviteType).toBe(InviteType.REPLACE)
      expect(response.body.data.targetMemberId).toBe(virtualMember.id)
    })

    it('should not allow non-admin to send invitation', async () => {
      const response = await request(app)
        .post(`/api/trips/${testTrip.id}/invitations`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          inviteeId: inviteeUser.id,
          inviteType: InviteType.ADD,
          message: 'Welcome!',
        })

      expect(response.status).toBe(403)
      expect(response.body.code).toBe('FORBIDDEN')
    })

    it('should not allow duplicate pending invitation', async () => {
      // First invitation
      await request(app)
        .post(`/api/trips/${testTrip.id}/invitations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          inviteeId: inviteeUser.id,
          inviteType: InviteType.ADD,
          message: 'First invitation',
        })

      // Duplicate invitation
      const response = await request(app)
        .post(`/api/trips/${testTrip.id}/invitations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          inviteeId: inviteeUser.id,
          inviteType: InviteType.ADD,
          message: 'Duplicate invitation',
        })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('已存在待处理的邀请')
    })
  })

  describe('GET /api/invitations', () => {
    beforeAll(async () => {
      // Create some invitations for the invitee
      await factories.invitation.create({
        tripId: testTrip.id,
        createdBy: adminUser.id,
        invitedUserId: inviteeUser.id,
        inviteType: InviteType.ADD,
      })
    })

    it('should return user received invitations', async () => {
      const inviteeToken = jwt.sign(
        { userId: inviteeUser.id, email: inviteeUser.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      )

      const response = await request(app)
        .get('/api/invitations')
        .set('Authorization', `Bearer ${inviteeToken}`)

      expect(response.status).toBe(200)
      expect(response.body.code).toBe('200')
      expect(Array.isArray(response.body.data)).toBe(true)
      expect(response.body.data.length).toBeGreaterThan(0)
      expect(response.body.data[0]).toHaveProperty('trip')
      expect(response.body.data[0]).toHaveProperty('inviter')
    })
  })

  describe('POST /api/invitations/:id/accept', () => {
    let invitation: any

    beforeEach(async () => {
      // Create a new user for each test
      const newInvitee = await factories.user.create()
      
      // Create invitation
      invitation = await factories.invitation.create({
        tripId: testTrip.id,
        createdBy: adminUser.id,
        invitedUserId: newInvitee.id,
        inviteType: InviteType.ADD,
      })
    })

    it('should accept ADD invitation successfully', async () => {
      const invitee = await prisma.user.findUnique({
        where: { id: invitation.invitedUserId }
      })

      const inviteeToken = jwt.sign(
        { userId: invitee!.id, email: invitee!.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      )

      const response = await request(app)
        .post(`/api/invitations/${invitation.id}/accept`)
        .set('Authorization', `Bearer ${inviteeToken}`)

      expect(response.status).toBe(200)
      expect(response.body.code).toBe('200')
      expect(response.body.data.status).toBe(InvitationStatus.ACCEPTED)

      // Verify member was added to trip
      const tripMember = await prisma.tripMember.findFirst({
        where: {
          tripId: testTrip.id,
          userId: invitee!.id,
        }
      })
      expect(tripMember).toBeTruthy()
      expect(tripMember?.role).toBe('member')
    })

    it('should accept REPLACE invitation and migrate data', async () => {
      // Create virtual member with some expenses
      const virtualMemberWithExpenses = await prisma.tripMember.create({
        data: {
          tripId: testTrip.id,
          displayName: 'Virtual with Expenses',
          isVirtual: true,
          role: 'member',
          contribution: 1000,
        }
      })

      // Create expense for virtual member
      const expense = await prisma.expense.create({
        data: {
          tripId: testTrip.id,
          payerMemberId: virtualMemberWithExpenses.id,
          payer_id: virtualMemberWithExpenses.id,
          description: 'Test expense',
          amount: 500,
          expenseDate: new Date(),
          createdBy: adminUser.id,
          participants: {
            create: {
              tripMemberId: virtualMemberWithExpenses.id,
              shareAmount: 500,
            }
          }
        }
      })

      // Create replace invitation
      const replaceInvitation = await factories.invitation.createReplaceInvitation(
        testTrip.id,
        adminUser.id,
        inviteeUser.id,
        virtualMemberWithExpenses.id
      )

      const inviteeToken = jwt.sign(
        { userId: inviteeUser.id, email: inviteeUser.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      )

      const response = await request(app)
        .post(`/api/invitations/${replaceInvitation.id}/accept`)
        .set('Authorization', `Bearer ${inviteeToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.targetMemberName).toBe('Virtual with Expenses')

      // Verify member was updated
      const updatedMember = await prisma.tripMember.findUnique({
        where: { id: virtualMemberWithExpenses.id }
      })
      expect(updatedMember?.userId).toBe(inviteeUser.id)
      expect(updatedMember?.isVirtual).toBe(false)
      expect(updatedMember?.displayName).toBe(inviteeUser.username)
      expect(updatedMember?.contribution).toBe(1000)

      // Verify expense was preserved
      const updatedExpense = await prisma.expense.findUnique({
        where: { id: expense.id }
      })
      expect(updatedExpense?.payerMemberId).toBe(virtualMemberWithExpenses.id)
    })
  })

  describe('POST /api/invitations/:id/reject', () => {
    let invitation: any

    beforeEach(async () => {
      invitation = await factories.invitation.create({
        tripId: testTrip.id,
        createdBy: adminUser.id,
        invitedUserId: inviteeUser.id,
        inviteType: InviteType.ADD,
      })
    })

    it('should reject invitation successfully', async () => {
      const inviteeToken = jwt.sign(
        { userId: inviteeUser.id, email: inviteeUser.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      )

      const response = await request(app)
        .post(`/api/invitations/${invitation.id}/reject`)
        .set('Authorization', `Bearer ${inviteeToken}`)

      expect(response.status).toBe(200)
      expect(response.body.code).toBe('200')
      expect(response.body.data.status).toBe(InvitationStatus.REJECTED)
    })

    it('should not allow rejecting others invitation', async () => {
      const response = await request(app)
        .post(`/api/invitations/${invitation.id}/reject`)
        .set('Authorization', `Bearer ${memberToken}`)

      expect(response.status).toBe(403)
    })
  })

  describe('Invitation Expiration', () => {
    it('should not allow accepting expired invitation', async () => {
      const expiredInvitation = await factories.invitation.createExpiredInvitation(
        testTrip.id,
        adminUser.id,
        inviteeUser.id
      )

      const inviteeToken = jwt.sign(
        { userId: inviteeUser.id, email: inviteeUser.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      )

      const response = await request(app)
        .post(`/api/invitations/${expiredInvitation.id}/accept`)
        .set('Authorization', `Bearer ${inviteeToken}`)

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('已过期')
    })
  })
})