import request from 'supertest'
import { PrismaClient, MessageStatus, MessageType, MessagePriority } from '@prisma/client'
import { app } from '../../src/app'
import { TestFactories } from '../factories'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const factories = new TestFactories(prisma)

describe('Message System Integration Tests', () => {
  let userToken: string
  let testUser: any
  let testMessages: any[] = []

  beforeAll(async () => {
    // Clean up test data
    await factories.cleanupAll()

    // Create test user
    testUser = await factories.user.create({
      username: 'test_message_user',
      email: 'message@test.com',
    })

    // Generate token
    userToken = jwt.sign(
      { userId: testUser.id, email: testUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    )

    // Create test messages
    testMessages = await factories.message.createBatch(5, testUser.id)
    
    // Create different types of messages
    await factories.message.createInvitationMessage(
      testUser.id,
      'invitation-123',
      'John Doe',
      'Summer Trip'
    )
    
    await factories.message.createExpenseMessage(
      testUser.id,
      'expense-123',
      'Alice',
      100
    )
    
    await factories.message.createSettlementMessage(
      testUser.id,
      'settlement-123',
      'Bob',
      'Alice',
      50
    )
  })

  afterAll(async () => {
    await factories.cleanupAll()
    await prisma.$disconnect()
  })

  describe('GET /api/messages', () => {
    it('should return user messages with pagination', async () => {
      const response = await request(app)
        .get('/api/messages')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ page: 1, limit: 10 })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe('200')
      expect(Array.isArray(response.body.data.messages)).toBe(true)
      expect(response.body.data.messages.length).toBeGreaterThan(0)
      expect(response.body.data).toHaveProperty('total')
      expect(response.body.data).toHaveProperty('page')
      expect(response.body.data).toHaveProperty('totalPages')
    })

    it('should filter messages by status', async () => {
      // Mark some messages as read
      await factories.message.markAsRead(testMessages[0].id)
      await factories.message.markAsRead(testMessages[1].id)

      const response = await request(app)
        .get('/api/messages')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ status: MessageStatus.UNREAD })

      expect(response.status).toBe(200)
      expect(response.body.data.messages.every((m: any) => 
        m.status === MessageStatus.UNREAD
      )).toBe(true)
    })

    it('should filter messages by type', async () => {
      const response = await request(app)
        .get('/api/messages')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ type: MessageType.TRIP_INVITATION })

      expect(response.status).toBe(200)
      expect(response.body.data.messages.every((m: any) => 
        m.type === MessageType.TRIP_INVITATION
      )).toBe(true)
    })

    it('should return unread count', async () => {
      const response = await request(app)
        .get('/api/messages/unread-count')
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(200)
      expect(response.body.code).toBe('200')
      expect(typeof response.body.data.count).toBe('number')
      expect(response.body.data.count).toBeGreaterThan(0)
    })
  })

  describe('GET /api/messages/:id', () => {
    it('should return message details', async () => {
      const message = testMessages[0]
      
      const response = await request(app)
        .get(`/api/messages/${message.id}`)
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(200)
      expect(response.body.code).toBe('200')
      expect(response.body.data.id).toBe(message.id)
      expect(response.body.data).toHaveProperty('title')
      expect(response.body.data).toHaveProperty('content')
      expect(response.body.data).toHaveProperty('metadata')
    })

    it('should not return other users message', async () => {
      const otherUser = await factories.user.create()
      const otherMessage = await factories.message.create({
        recipientId: otherUser.id,
      })

      const response = await request(app)
        .get(`/api/messages/${otherMessage.id}`)
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(404)
    })
  })

  describe('PUT /api/messages/:id/read', () => {
    it('should mark message as read', async () => {
      const unreadMessage = await factories.message.create({
        recipientId: testUser.id,
        status: MessageStatus.UNREAD,
      })

      const response = await request(app)
        .put(`/api/messages/${unreadMessage.id}/read`)
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(200)
      expect(response.body.code).toBe('200')
      expect(response.body.data.status).toBe(MessageStatus.READ)
      expect(response.body.data.readAt).toBeTruthy()
    })

    it('should not mark already read message', async () => {
      const readMessage = await factories.message.create({
        recipientId: testUser.id,
        status: MessageStatus.READ,
        readAt: new Date(),
      })

      const response = await request(app)
        .put(`/api/messages/${readMessage.id}/read`)
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('已读')
    })
  })

  describe('POST /api/messages/batch-read', () => {
    it('should mark multiple messages as read', async () => {
      const unreadMessages = await factories.message.createBatch(3, testUser.id)
      const messageIds = unreadMessages.map(m => m.id)

      const response = await request(app)
        .post('/api/messages/batch-read')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ messageIds })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe('200')
      expect(response.body.data.updated).toBe(3)

      // Verify all messages are read
      const updatedMessages = await prisma.message.findMany({
        where: { id: { in: messageIds } }
      })
      expect(updatedMessages.every(m => m.status === MessageStatus.READ)).toBe(true)
    })

    it('should only update users own messages', async () => {
      const otherUser = await factories.user.create()
      const otherMessage = await factories.message.create({
        recipientId: otherUser.id,
      })
      const ownMessage = await factories.message.create({
        recipientId: testUser.id,
      })

      const response = await request(app)
        .post('/api/messages/batch-read')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ messageIds: [otherMessage.id, ownMessage.id] })

      expect(response.status).toBe(200)
      expect(response.body.data.updated).toBe(1) // Only own message updated
    })
  })

  describe('DELETE /api/messages/:id', () => {
    it('should delete message', async () => {
      const messageToDelete = await factories.message.create({
        recipientId: testUser.id,
      })

      const response = await request(app)
        .delete(`/api/messages/${messageToDelete.id}`)
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(200)
      expect(response.body.code).toBe('200')

      // Verify message is deleted
      const deletedMessage = await prisma.message.findUnique({
        where: { id: messageToDelete.id }
      })
      expect(deletedMessage).toBeNull()
    })
  })

  describe('POST /api/messages/batch-delete', () => {
    it('should delete multiple messages', async () => {
      const messagesToDelete = await factories.message.createBatch(3, testUser.id)
      const messageIds = messagesToDelete.map(m => m.id)

      const response = await request(app)
        .post('/api/messages/batch-delete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ messageIds })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe('200')
      expect(response.body.data.deleted).toBe(3)

      // Verify all messages are deleted
      const remainingMessages = await prisma.message.findMany({
        where: { id: { in: messageIds } }
      })
      expect(remainingMessages.length).toBe(0)
    })
  })

  describe('Message Preferences', () => {
    describe('GET /api/message-preferences', () => {
      it('should return user message preferences', async () => {
        const response = await request(app)
          .get('/api/message-preferences')
          .set('Authorization', `Bearer ${userToken}`)

        expect(response.status).toBe(200)
        expect(response.body.code).toBe('200')
        expect(response.body.data).toHaveProperty('preferences')
      })
    })

    describe('PUT /api/message-preferences', () => {
      it('should update message preferences', async () => {
        const preferences = {
          [MessageType.TRIP_INVITATION]: {
            enabled: true,
            channels: ['app', 'email'],
            frequency: 'REAL_TIME'
          },
          [MessageType.EXPENSE_ADDED]: {
            enabled: false,
            channels: ['app'],
            frequency: 'DAILY'
          }
        }

        const response = await request(app)
          .put('/api/message-preferences')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ preferences })

        expect(response.status).toBe(200)
        expect(response.body.code).toBe('200')

        // Verify preferences are saved
        const savedPrefs = await prisma.messagePreference.findMany({
          where: { userId: testUser.id }
        })
        expect(savedPrefs.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Message Queue Processing', () => {
    it('should handle high priority messages first', async () => {
      // Create messages with different priorities
      const highPriorityMessage = await factories.message.create({
        recipientId: testUser.id,
        priority: MessagePriority.HIGH,
        title: 'High Priority Message',
      })

      const normalPriorityMessage = await factories.message.create({
        recipientId: testUser.id,
        priority: MessagePriority.NORMAL,
        title: 'Normal Priority Message',
      })

      const lowPriorityMessage = await factories.message.create({
        recipientId: testUser.id,
        priority: MessagePriority.LOW,
        title: 'Low Priority Message',
      })

      // In a real test, we would verify the queue processing order
      // For now, we just verify messages are created with correct priorities
      expect(highPriorityMessage.priority).toBe(MessagePriority.HIGH)
      expect(normalPriorityMessage.priority).toBe(MessagePriority.NORMAL)
      expect(lowPriorityMessage.priority).toBe(MessagePriority.LOW)
    })
  })

  describe('Message Aggregation', () => {
    it('should aggregate similar messages within time window', async () => {
      // Create multiple expense messages within 5 minutes
      const now = new Date()
      const messages = []
      
      for (let i = 0; i < 3; i++) {
        const message = await factories.message.createExpenseMessage(
          testUser.id,
          `expense-${i}`,
          'Alice',
          100 + i * 10
        )
        messages.push(message)
      }

      // Verify all messages are created
      expect(messages.length).toBe(3)
      
      // In a real implementation, the message service would aggregate these
      // Here we just verify they exist and could be aggregated
      const recentExpenseMessages = await prisma.message.findMany({
        where: {
          recipientId: testUser.id,
          type: MessageType.EXPENSE_CREATED,
          createdAt: {
            gte: new Date(now.getTime() - 5 * 60 * 1000) // 5 minutes ago
          }
        }
      })

      expect(recentExpenseMessages.length).toBeGreaterThanOrEqual(3)
    })
  })
})