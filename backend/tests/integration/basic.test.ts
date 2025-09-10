import { PrismaClient } from '@prisma/client'
import { TestFactories } from '../factories'

const prisma = new PrismaClient()
const factories = new TestFactories(prisma)

describe('Basic Test Setup', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('Database Connection', () => {
    it('should connect to database', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as result`
      expect(result).toBeDefined()
    })
  })

  describe('Test Factories', () => {
    it('should create a test user', async () => {
      const user = await factories.user.create({
        username: 'basic_test_user',
        email: 'basic@test.com',
      })
      
      expect(user).toBeDefined()
      expect(user.id).toBeDefined()
      expect(user.username).toBe('basic_test_user')
      expect(user.email).toBe('basic@test.com')
      
      // Clean up
      await prisma.user.delete({ where: { id: user.id } })
    })

    it('should create a user with trip', async () => {
      const { user, trip } = await factories.user.createWithTrip('Basic Test Trip')
      
      expect(user).toBeDefined()
      expect(trip).toBeDefined()
      expect(trip.name).toBe('Basic Test Trip')
      expect(trip.members.length).toBeGreaterThan(0)
      
      // Clean up
      await prisma.tripMember.deleteMany({ where: { tripId: trip.id } })
      await prisma.trip.delete({ where: { id: trip.id } })
      await prisma.user.delete({ where: { id: user.id } })
    })
  })
})