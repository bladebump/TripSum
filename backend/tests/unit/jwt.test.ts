import jwt from 'jsonwebtoken'
import { generateToken, verifyToken, decodeToken } from '../../src/utils/jwt'

jest.mock('jsonwebtoken')

describe('JWT Utils', () => {
  const mockPayload = {
    userId: 'user-123',
    email: 'test@example.com',
  }
  
  const mockSecret = 'test-secret'
  const mockToken = 'mock-jwt-token'
  
  beforeEach(() => {
    process.env.JWT_SECRET = mockSecret
    jest.clearAllMocks()
  })
  
  afterEach(() => {
    delete process.env.JWT_SECRET
  })
  
  describe('generateToken', () => {
    it('should generate access token with correct payload and options', () => {
      ;(jwt.sign as jest.Mock).mockReturnValue(mockToken)
      
      const result = generateToken(mockPayload, 'access')
      
      expect(result).toBe(mockToken)
      expect(jwt.sign).toHaveBeenCalledWith(
        { ...mockPayload, type: 'access' },
        mockSecret,
        { expiresIn: '15m' }
      )
    })
    
    it('should generate refresh token with correct payload and options', () => {
      ;(jwt.sign as jest.Mock).mockReturnValue(mockToken)
      
      const result = generateToken(mockPayload, 'refresh')
      
      expect(result).toBe(mockToken)
      expect(jwt.sign).toHaveBeenCalledWith(
        { ...mockPayload, type: 'refresh' },
        mockSecret,
        { expiresIn: '7d' }
      )
    })
    
    it('should use custom expiration time', () => {
      ;(jwt.sign as jest.Mock).mockReturnValue(mockToken)
      
      const customExpiry = '1h'
      const result = generateToken(mockPayload, 'access', customExpiry)
      
      expect(result).toBe(mockToken)
      expect(jwt.sign).toHaveBeenCalledWith(
        { ...mockPayload, type: 'access' },
        mockSecret,
        { expiresIn: customExpiry }
      )
    })
    
    it('should throw error if JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET
      
      expect(() => generateToken(mockPayload, 'access'))
        .toThrow('JWT_SECRET environment variable is not set')
    })
  })
  
  describe('verifyToken', () => {
    it('should verify token successfully', () => {
      const decodedPayload = { ...mockPayload, type: 'access' }
      ;(jwt.verify as jest.Mock).mockReturnValue(decodedPayload)
      
      const result = verifyToken(mockToken)
      
      expect(result).toEqual(decodedPayload)
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, mockSecret)
    })
    
    it('should throw error for invalid token', () => {
      const error = new Error('Invalid token')
      ;(jwt.verify as jest.Mock).mockImplementation(() => {
        throw error
      })
      
      expect(() => verifyToken(mockToken)).toThrow('Invalid token')
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, mockSecret)
    })
    
    it('should throw error for expired token', () => {
      const error = new jwt.TokenExpiredError('Token expired', new Date())
      ;(jwt.verify as jest.Mock).mockImplementation(() => {
        throw error
      })
      
      expect(() => verifyToken(mockToken)).toThrow('Token expired')
    })
    
    it('should throw error if JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET
      
      expect(() => verifyToken(mockToken))
        .toThrow('JWT_SECRET environment variable is not set')
    })
  })
  
  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const decodedPayload = { ...mockPayload, type: 'access' }
      ;(jwt.decode as jest.Mock).mockReturnValue(decodedPayload)
      
      const result = decodeToken(mockToken)
      
      expect(result).toEqual(decodedPayload)
      expect(jwt.decode).toHaveBeenCalledWith(mockToken)
    })
    
    it('should return null for invalid token format', () => {
      ;(jwt.decode as jest.Mock).mockReturnValue(null)
      
      const result = decodeToken('invalid-token')
      
      expect(result).toBeNull()
      expect(jwt.decode).toHaveBeenCalledWith('invalid-token')
    })
  })
  
  describe('token type validation', () => {
    it('should handle access token type correctly', () => {
      ;(jwt.sign as jest.Mock).mockReturnValue(mockToken)
      
      generateToken(mockPayload, 'access')
      
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'access' }),
        mockSecret,
        expect.any(Object)
      )
    })
    
    it('should handle refresh token type correctly', () => {
      ;(jwt.sign as jest.Mock).mockReturnValue(mockToken)
      
      generateToken(mockPayload, 'refresh')
      
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'refresh' }),
        mockSecret,
        expect.any(Object)
      )
    })
  })
  
  describe('edge cases', () => {
    it('should handle empty payload', () => {
      ;(jwt.sign as jest.Mock).mockReturnValue(mockToken)
      
      const result = generateToken({}, 'access')
      
      expect(result).toBe(mockToken)
      expect(jwt.sign).toHaveBeenCalledWith(
        { type: 'access' },
        mockSecret,
        { expiresIn: '15m' }
      )
    })
    
    it('should handle null payload values', () => {
      ;(jwt.sign as jest.Mock).mockReturnValue(mockToken)
      
      const nullPayload = { userId: null, email: null }
      const result = generateToken(nullPayload, 'access')
      
      expect(result).toBe(mockToken)
      expect(jwt.sign).toHaveBeenCalledWith(
        { ...nullPayload, type: 'access' },
        mockSecret,
        { expiresIn: '15m' }
      )
    })
  })
})