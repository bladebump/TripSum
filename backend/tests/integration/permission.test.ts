import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import { app } from '../../src/app'
import { TestFactories } from '../factories'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const factories = new TestFactories(prisma)

describe('Permission Control Integration Tests', () => {
  let adminToken: string
  let memberToken: string
  let nonMemberToken: string
  let adminUser: any
  let memberUser: any
  let nonMemberUser: any
  let testTrip: any
  let testExpense: any

  beforeAll(async () => {
    // Clean up test data
    await factories.cleanupAll()

    // Create test users
    adminUser = await factories.user.create({
      username: 'permission_admin',
      email: 'perm_admin@test.com',
    })

    memberUser = await factories.user.create({
      username: 'permission_member',
      email: 'perm_member@test.com',
    })

    nonMemberUser = await factories.user.create({
      username: 'permission_nonmember',
      email: 'perm_nonmember@test.com',
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

    nonMemberToken = jwt.sign(
      { userId: nonMemberUser.id, email: nonMemberUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    )

    // Create test trip with admin and member
    testTrip = await prisma.trip.create({
      data: {
        name: 'Permission Test Trip',
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
            }
          ]
        }
      },
      include: {
        members: true
      }
    })

    // Create test expense
    const adminMember = testTrip.members.find((m: any) => m.userId === adminUser.id)
    testExpense = await prisma.expense.create({
      data: {
        tripId: testTrip.id,
        payerMemberId: adminMember.id,
        payer_id: adminMember.id,
        description: 'Test expense for permission',
        amount: 100,
        expenseDate: new Date(),
        createdBy: adminUser.id,
      }
    })
  })

  afterAll(async () => {
    await factories.cleanupAll()
    await prisma.$disconnect()
  })

  describe('Admin-only Endpoints', () => {
    describe('Expense Management', () => {
      it('should allow admin to create expense', async () => {
        const adminMember = testTrip.members.find((m: any) => m.userId === adminUser.id)
        const memberMember = testTrip.members.find((m: any) => m.userId === memberUser.id)

        const response = await request(app)
          .post(`/api/trips/${testTrip.id}/expenses`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            payerId: adminMember.id,
            description: 'Admin created expense',
            amount: 200,
            expenseDate: new Date().toISOString(),
            participants: [
              { memberId: adminMember.id, amount: 100 },
              { memberId: memberMember.id, amount: 100 }
            ]
          })

        expect(response.status).toBe(200)
        expect(response.body.code).toBe('200')
        expect(response.body.data).toHaveProperty('id')
      })

      it('should not allow member to create expense', async () => {
        const memberMember = testTrip.members.find((m: any) => m.userId === memberUser.id)

        const response = await request(app)
          .post(`/api/trips/${testTrip.id}/expenses`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({
            payerId: memberMember.id,
            description: 'Member trying to create expense',
            amount: 200,
            expenseDate: new Date().toISOString(),
            participants: [
              { memberId: memberMember.id, amount: 200 }
            ]
          })

        expect(response.status).toBe(403)
        expect(response.body.code).toBe('FORBIDDEN')
        expect(response.body.message).toContain('管理员')
      })

      it('should allow admin to update expense', async () => {
        const response = await request(app)
          .put(`/api/expenses/${testExpense.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            description: 'Updated expense description',
            amount: 150
          })

        expect(response.status).toBe(200)
        expect(response.body.code).toBe('200')
        expect(response.body.data.description).toBe('Updated expense description')
      })

      it('should not allow member to update expense', async () => {
        const response = await request(app)
          .put(`/api/expenses/${testExpense.id}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({
            description: 'Member trying to update',
            amount: 150
          })

        expect(response.status).toBe(403)
        expect(response.body.code).toBe('FORBIDDEN')
      })

      it('should allow admin to delete expense', async () => {
        const adminMember = testTrip.members.find((m: any) => m.userId === adminUser.id)
        const expenseToDelete = await prisma.expense.create({
          data: {
            tripId: testTrip.id,
            payerMemberId: adminMember.id,
            payer_id: adminMember.id,
            description: 'Expense to delete',
            amount: 50,
            expenseDate: new Date(),
            createdBy: adminUser.id,
          }
        })

        const response = await request(app)
          .delete(`/api/expenses/${expenseToDelete.id}`)
          .set('Authorization', `Bearer ${adminToken}`)

        expect(response.status).toBe(200)
        expect(response.body.code).toBe('200')
      })

      it('should not allow member to delete expense', async () => {
        const response = await request(app)
          .delete(`/api/expenses/${testExpense.id}`)
          .set('Authorization', `Bearer ${memberToken}`)

        expect(response.status).toBe(403)
        expect(response.body.code).toBe('FORBIDDEN')
      })
    })

    describe('Invitation Management', () => {
      it('should allow admin to send invitation', async () => {
        const response = await request(app)
          .post(`/api/trips/${testTrip.id}/invitations`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            inviteeId: nonMemberUser.id,
            inviteType: 'ADD',
            message: 'Admin inviting user',
          })

        expect(response.status).toBe(200)
        expect(response.body.code).toBe('200')
      })

      it('should not allow member to send invitation', async () => {
        const response = await request(app)
          .post(`/api/trips/${testTrip.id}/invitations`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({
            inviteeId: nonMemberUser.id,
            inviteType: 'ADD',
            message: 'Member trying to invite',
          })

        expect(response.status).toBe(403)
        expect(response.body.code).toBe('FORBIDDEN')
      })

      it('should allow admin to view trip invitations', async () => {
        const response = await request(app)
          .get(`/api/trips/${testTrip.id}/invitations`)
          .set('Authorization', `Bearer ${adminToken}`)

        expect(response.status).toBe(200)
        expect(response.body.code).toBe('200')
        expect(Array.isArray(response.body.data)).toBe(true)
      })

      it('should not allow member to view trip invitations', async () => {
        const response = await request(app)
          .get(`/api/trips/${testTrip.id}/invitations`)
          .set('Authorization', `Bearer ${memberToken}`)

        expect(response.status).toBe(403)
        expect(response.body.code).toBe('FORBIDDEN')
      })
    })

    describe('AI Features', () => {
      it('should allow admin to use AI parse', async () => {
        const response = await request(app)
          .post('/api/ai/parse')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            text: '午餐花了200元，大家平摊',
            tripId: testTrip.id
          })

        // AI endpoint might fail due to API key, but permission should pass
        expect([200, 500]).toContain(response.status)
        if (response.status === 403) {
          expect(response.body.code).not.toBe('FORBIDDEN')
        }
      })

      it('should not allow member to use AI parse', async () => {
        const response = await request(app)
          .post('/api/ai/parse')
          .set('Authorization', `Bearer ${memberToken}`)
          .send({
            text: '午餐花了200元，大家平摊',
            tripId: testTrip.id
          })

        expect(response.status).toBe(403)
        expect(response.body.code).toBe('FORBIDDEN')
      })

      it('should allow admin to batch add members', async () => {
        const response = await request(app)
          .post('/api/ai/add-members')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            text: '添加张三、李四、王五',
            tripId: testTrip.id
          })

        // AI endpoint might fail due to API key, but permission should pass
        expect([200, 500]).toContain(response.status)
        if (response.status === 403) {
          expect(response.body.code).not.toBe('FORBIDDEN')
        }
      })

      it('should not allow member to batch add members', async () => {
        const response = await request(app)
          .post('/api/ai/add-members')
          .set('Authorization', `Bearer ${memberToken}`)
          .send({
            text: '添加张三、李四、王五',
            tripId: testTrip.id
          })

        expect(response.status).toBe(403)
        expect(response.body.code).toBe('FORBIDDEN')
      })
    })
  })

  describe('Member Access Control', () => {
    it('should allow members to view trip details', async () => {
      const response = await request(app)
        .get(`/api/trips/${testTrip.id}`)
        .set('Authorization', `Bearer ${memberToken}`)

      expect(response.status).toBe(200)
      expect(response.body.code).toBe('200')
      expect(response.body.data.id).toBe(testTrip.id)
    })

    it('should not allow non-members to view trip details', async () => {
      const response = await request(app)
        .get(`/api/trips/${testTrip.id}`)
        .set('Authorization', `Bearer ${nonMemberToken}`)

      expect(response.status).toBe(403)
      expect(response.body.message).toContain('不是该行程的成员')
    })

    it('should allow members to view expenses', async () => {
      const response = await request(app)
        .get(`/api/expenses/${testExpense.id}`)
        .set('Authorization', `Bearer ${memberToken}`)

      expect(response.status).toBe(200)
      expect(response.body.code).toBe('200')
    })

    it('should not allow non-members to view expenses', async () => {
      const response = await request(app)
        .get(`/api/expenses/${testExpense.id}`)
        .set('Authorization', `Bearer ${nonMemberToken}`)

      expect(response.status).toBe(403)
    })

    it('should allow members to view balances', async () => {
      const response = await request(app)
        .get(`/api/trips/${testTrip.id}/balances`)
        .set('Authorization', `Bearer ${memberToken}`)

      expect(response.status).toBe(200)
      expect(response.body.code).toBe('200')
      expect(Array.isArray(response.body.data)).toBe(true)
    })

    it('should not allow non-members to view balances', async () => {
      const response = await request(app)
        .get(`/api/trips/${testTrip.id}/balances`)
        .set('Authorization', `Bearer ${nonMemberToken}`)

      expect(response.status).toBe(403)
    })
  })

  describe('Authentication Requirements', () => {
    it('should reject requests without token', async () => {
      const response = await request(app)
        .get(`/api/trips/${testTrip.id}`)

      expect(response.status).toBe(401)
      expect(response.body.code).toBe('UNAUTHORIZED')
    })

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get(`/api/trips/${testTrip.id}`)
        .set('Authorization', 'Bearer invalid-token')

      expect(response.status).toBe(401)
      expect(response.body.code).toBe('UNAUTHORIZED')
    })

    it('should reject requests with expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: adminUser.id, email: adminUser.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Already expired
      )

      const response = await request(app)
        .get(`/api/trips/${testTrip.id}`)
        .set('Authorization', `Bearer ${expiredToken}`)

      expect(response.status).toBe(401)
      expect(response.body.message).toContain('expired')
    })
  })

  describe('Trip Ownership', () => {
    it('should allow admin to delete trip', async () => {
      const tripToDelete = await prisma.trip.create({
        data: {
          name: 'Trip to delete',
          startDate: new Date(),
          endDate: new Date(),
          currency: 'CNY',
          creator: {
          connect: { id: adminUser.id }
        },
          members: {
            create: {
              userId: adminUser.id,
              displayName: adminUser.username,
              role: 'admin',
              isVirtual: false,
            }
          }
        }
      })

      const response = await request(app)
        .delete(`/api/trips/${tripToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.code).toBe('200')
    })

    it('should not allow member to delete trip', async () => {
      const response = await request(app)
        .delete(`/api/trips/${testTrip.id}`)
        .set('Authorization', `Bearer ${memberToken}`)

      expect(response.status).toBe(403)
      expect(response.body.code).toBe('FORBIDDEN')
    })

    it('should allow admin to update trip', async () => {
      const response = await request(app)
        .put(`/api/trips/${testTrip.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Trip Name',
          description: 'Updated description'
        })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe('200')
      expect(response.body.data.name).toBe('Updated Trip Name')
    })

    it('should not allow member to update trip', async () => {
      const response = await request(app)
        .put(`/api/trips/${testTrip.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Member trying to update',
        })

      expect(response.status).toBe(403)
      expect(response.body.code).toBe('FORBIDDEN')
    })
  })
})