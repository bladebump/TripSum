import { success, error, paginated } from '../../src/utils/response'

describe('Response Utils', () => {
  describe('success', () => {
    it('should return success response with data', () => {
      const data = { id: 1, name: 'Test' }
      const result = success(data)
      
      expect(result).toEqual({
        code: '200',
        message: 'Success',
        data,
        timestamp: expect.any(String),
      })
    })
    
    it('should return success response with custom message', () => {
      const data = { id: 1, name: 'Test' }
      const message = 'Operation completed successfully'
      const result = success(data, message)
      
      expect(result).toEqual({
        code: '200',
        message,
        data,
        timestamp: expect.any(String),
      })
    })
    
    it('should return success response with null data', () => {
      const result = success(null)
      
      expect(result).toEqual({
        code: '200',
        message: 'Success',
        data: null,
        timestamp: expect.any(String),
      })
    })
    
    it('should return success response with empty object', () => {
      const result = success({})
      
      expect(result).toEqual({
        code: '200',
        message: 'Success',
        data: {},
        timestamp: expect.any(String),
      })
    })
    
    it('should include valid ISO timestamp', () => {
      const result = success({ test: true })
      const timestamp = new Date(result.timestamp)
      
      expect(timestamp).toBeInstanceOf(Date)
      expect(timestamp.getTime()).not.toBeNaN()
    })
  })
  
  describe('error', () => {
    it('should return error response with default message', () => {
      const result = error('400')
      
      expect(result).toEqual({
        code: '400',
        message: 'Bad Request',
        timestamp: expect.any(String),
      })
    })
    
    it('should return error response with custom message', () => {
      const code = '404'
      const message = 'Resource not found'
      const result = error(code, message)
      
      expect(result).toEqual({
        code,
        message,
        timestamp: expect.any(String),
      })
    })
    
    it('should return error response with details', () => {
      const code = '422'
      const message = 'Validation failed'
      const details = { field: 'email', reason: 'Invalid format' }
      const result = error(code, message, details)
      
      expect(result).toEqual({
        code,
        message,
        details,
        timestamp: expect.any(String),
      })
    })
    
    it('should handle different error codes correctly', () => {
      const testCases = [
        { code: '400', expectedMessage: 'Bad Request' },
        { code: '401', expectedMessage: 'Unauthorized' },
        { code: '403', expectedMessage: 'Forbidden' },
        { code: '404', expectedMessage: 'Not Found' },
        { code: '500', expectedMessage: 'Internal Server Error' },
      ]
      
      testCases.forEach(({ code, expectedMessage }) => {
        const result = error(code)
        expect(result.code).toBe(code)
        expect(result.message).toBe(expectedMessage)
      })
    })
    
    it('should include valid ISO timestamp', () => {
      const result = error('400')
      const timestamp = new Date(result.timestamp)
      
      expect(timestamp).toBeInstanceOf(Date)
      expect(timestamp.getTime()).not.toBeNaN()
    })
  })
  
  describe('paginated', () => {
    it('should return paginated response with all fields', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }]
      const total = 100
      const page = 2
      const limit = 10
      
      const result = paginated(items, total, page, limit)
      
      expect(result).toEqual({
        code: '200',
        message: 'Success',
        data: {
          items,
          pagination: {
            total,
            page,
            limit,
            totalPages: 10,
            hasNext: true,
            hasPrev: true,
          },
        },
        timestamp: expect.any(String),
      })
    })
    
    it('should calculate totalPages correctly', () => {
      const testCases = [
        { total: 100, limit: 10, expected: 10 },
        { total: 99, limit: 10, expected: 10 },
        { total: 101, limit: 10, expected: 11 },
        { total: 0, limit: 10, expected: 0 },
        { total: 5, limit: 10, expected: 1 },
      ]
      
      testCases.forEach(({ total, limit, expected }) => {
        const result = paginated([], total, 1, limit)
        expect(result.data.pagination.totalPages).toBe(expected)
      })
    })
    
    it('should calculate hasNext correctly', () => {
      const testCases = [
        { page: 1, totalPages: 5, expected: true },
        { page: 5, totalPages: 5, expected: false },
        { page: 3, totalPages: 5, expected: true },
        { page: 1, totalPages: 1, expected: false },
        { page: 1, totalPages: 0, expected: false },
      ]
      
      testCases.forEach(({ page, totalPages, expected }) => {
        const total = totalPages * 10
        const result = paginated([], total, page, 10)
        expect(result.data.pagination.hasNext).toBe(expected)
      })
    })
    
    it('should calculate hasPrev correctly', () => {
      const testCases = [
        { page: 1, expected: false },
        { page: 2, expected: true },
        { page: 5, expected: true },
      ]
      
      testCases.forEach(({ page, expected }) => {
        const result = paginated([], 100, page, 10)
        expect(result.data.pagination.hasPrev).toBe(expected)
      })
    })
    
    it('should handle empty results', () => {
      const result = paginated([], 0, 1, 10)
      
      expect(result).toEqual({
        code: '200',
        message: 'Success',
        data: {
          items: [],
          pagination: {
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        },
        timestamp: expect.any(String),
      })
    })
    
    it('should handle single page results', () => {
      const items = [{ id: 1 }, { id: 2 }]
      const result = paginated(items, 2, 1, 10)
      
      expect(result.data.pagination).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      })
    })
    
    it('should include valid ISO timestamp', () => {
      const result = paginated([], 0, 1, 10)
      const timestamp = new Date(result.timestamp)
      
      expect(timestamp).toBeInstanceOf(Date)
      expect(timestamp.getTime()).not.toBeNaN()
    })
  })
  
  describe('response format consistency', () => {
    it('should have consistent timestamp format across all response types', () => {
      const successResponse = success({ test: true })
      const errorResponse = error('400')
      const paginatedResponse = paginated([], 0, 1, 10)
      
      // All timestamps should be valid ISO strings
      expect(new Date(successResponse.timestamp)).toBeInstanceOf(Date)
      expect(new Date(errorResponse.timestamp)).toBeInstanceOf(Date)
      expect(new Date(paginatedResponse.timestamp)).toBeInstanceOf(Date)
      
      // Timestamps should be relatively close (within 1 second)
      const successTime = new Date(successResponse.timestamp).getTime()
      const errorTime = new Date(errorResponse.timestamp).getTime()
      const paginatedTime = new Date(paginatedResponse.timestamp).getTime()
      
      expect(Math.abs(successTime - errorTime)).toBeLessThan(1000)
      expect(Math.abs(successTime - paginatedTime)).toBeLessThan(1000)
    })
    
    it('should have consistent code format', () => {
      const successResponse = success({ test: true })
      const errorResponse = error('400')
      const paginatedResponse = paginated([], 0, 1, 10)
      
      expect(typeof successResponse.code).toBe('string')
      expect(typeof errorResponse.code).toBe('string')
      expect(typeof paginatedResponse.code).toBe('string')
    })
  })
})