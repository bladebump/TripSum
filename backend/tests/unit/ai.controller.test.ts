import { Response } from 'express'
import { aiController } from '../../src/controllers/ai.controller'
import { tripService } from '../../src/services/trip.service'
import { unifiedAIParser } from '../../src/services/ai.unified.parser'
import { AuthenticatedRequest } from '../../src/types'

// Mock依赖
jest.mock('../../src/services/trip.service')
jest.mock('../../src/services/ai.unified.parser')
jest.mock('../../src/utils/logger')

describe('AI Controller - userId到memberId转换测试', () => {
  let mockReq: Partial<AuthenticatedRequest>
  let mockRes: Partial<Response>
  let sendSuccess: jest.Mock
  let sendError: jest.Mock

  // Mock数据
  const mockUserId = 'user-123'
  const mockTripId = 'trip-456'
  const mockMemberId = 'member-789'
  const mockMembers = [
    {
      id: mockMemberId,
      userId: mockUserId,
      tripId: mockTripId,
      role: 'admin',
      displayName: 'Test User',
      isVirtual: false,
      isActive: true,
      user: {
        id: mockUserId,
        username: 'testuser',
        email: 'test@example.com'
      }
    },
    {
      id: 'member-002',
      userId: 'user-002',
      tripId: mockTripId,
      role: 'member',
      displayName: 'Member 2',
      isVirtual: false,
      isActive: true,
      user: {
        id: 'user-002',
        username: 'member2',
        email: 'member2@example.com'
      }
    },
    {
      id: 'member-virtual',
      userId: null,
      tripId: mockTripId,
      role: 'member',
      displayName: '虚拟成员',
      isVirtual: true,
      isActive: true,
      user: null
    }
  ]

  beforeEach(() => {
    // 重置mocks
    jest.clearAllMocks()

    // 设置request mock
    mockReq = {
      userId: mockUserId,
      body: {
        tripId: mockTripId,
        text: '测试文本',
        members: mockMembers.map(m => ({
          id: m.id,
          name: m.displayName
        }))
      },
      params: {}
    }

    // 设置response mock
    sendSuccess = jest.fn()
    sendError = jest.fn()
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    }

    // Mock sendSuccess/sendError（通过手动注入）
    jest.doMock('../../src/utils/response', () => ({
      sendSuccess: sendSuccess,
      sendError: sendError
    }))
  })

  describe('parseUserInput', () => {
    it('应该正确获取当前用户的memberId', async () => {
      // Mock服务响应
      const mockedTripService = tripService as jest.Mocked<typeof tripService>
      mockedTripService.getTripDetail.mockResolvedValue({ id: mockTripId, name: 'Test Trip' } as any)
      mockedTripService.getTripMembers.mockResolvedValue(mockMembers as any)

      const mockedParser = unifiedAIParser as jest.Mocked<typeof unifiedAIParser>
      mockedParser.parseUserInput.mockResolvedValue({
        success: true,
        intent: { intent: 'expense', confidence: 0.9 },
        data: {}
      } as any)

      // 执行方法
      await aiController.parseUserInput(mockReq as AuthenticatedRequest, mockRes as Response)

      // 验证调用
      expect(mockedTripService.getTripDetail).toHaveBeenCalledWith(mockTripId, mockUserId)
      expect(mockedTripService.getTripMembers).toHaveBeenCalledWith(mockTripId, mockUserId)
      
      // 验证正确传递了memberId而不是userId
      expect(mockedParser.parseUserInput).toHaveBeenCalledWith(
        mockTripId,
        '测试文本',
        mockReq.body.members,
        mockMemberId // 这里应该是memberId，不是userId
      )
    })

    it('应该处理用户不是成员的情况', async () => {
      // Mock服务响应 - 用户不在成员列表中
      const mockedTripService = tripService as jest.Mocked<typeof tripService>
      mockedTripService.getTripDetail.mockResolvedValue({ id: mockTripId, name: 'Test Trip' } as any)
      mockedTripService.getTripMembers.mockResolvedValue([
        {
          id: 'other-member',
          userId: 'other-user',
          tripId: mockTripId,
          role: 'member'
        }
      ] as any)

      // 执行方法
      await aiController.parseUserInput(mockReq as AuthenticatedRequest, mockRes as Response)

      // 验证返回错误
      expect(sendError).toHaveBeenCalledWith(
        mockRes,
        '500',
        '无法找到当前用户的成员信息',
        500
      )
      
      // 验证没有调用parser
      const mockedParser = unifiedAIParser as jest.Mocked<typeof unifiedAIParser>
      expect(mockedParser.parseUserInput).not.toHaveBeenCalled()
    })

    it('应该处理虚拟成员的情况', async () => {
      // 设置当前用户为null（模拟虚拟成员场景）
      // 注意：实际上虚拟成员不会有JWT token，这里只是测试边界情况
      const virtualMemberReq = {
        ...mockReq,
        userId: undefined
      } as any

      const mockedTripService = tripService as jest.Mocked<typeof tripService>
      mockedTripService.getTripDetail.mockResolvedValue({ id: mockTripId, name: 'Test Trip' } as any)
      mockedTripService.getTripMembers.mockResolvedValue(mockMembers as any)

      // 执行方法
      await aiController.parseUserInput(virtualMemberReq as AuthenticatedRequest, mockRes as Response)

      // 应该返回错误，因为虚拟成员没有userId
      expect(sendError).toHaveBeenCalled()
    })

    it('应该验证必要参数', async () => {
      // 缺少tripId
      mockReq.body = { text: '测试文本' }
      
      await aiController.parseUserInput(mockReq as AuthenticatedRequest, mockRes as Response)
      
      expect(sendError).toHaveBeenCalledWith(
        mockRes,
        '400',
        '缺少必要参数',
        400
      )
    })

    it('应该验证text参数', async () => {
      // 缺少text
      mockReq.body = { tripId: mockTripId }
      
      await aiController.parseUserInput(mockReq as AuthenticatedRequest, mockRes as Response)
      
      expect(sendError).toHaveBeenCalledWith(
        mockRes,
        '400',
        '缺少必要参数',
        400
      )
    })
  })

  describe('addMembers', () => {
    it('应该验证用户权限（管理员）', async () => {
      mockReq.body = {
        tripId: mockTripId,
        memberNames: ['新成员1', '新成员2']
      }

      const mockedTripService = tripService as jest.Mocked<typeof tripService>
      mockedTripService.getTripDetail.mockResolvedValue({ id: mockTripId, name: 'Test Trip' } as any)
      mockedTripService.getTripMembers.mockResolvedValue(mockMembers as any)

      const mockedParser = unifiedAIParser as jest.Mocked<typeof unifiedAIParser>
      mockedParser.handleMemberAddition.mockResolvedValue({
        success: true,
        added: ['新成员1', '新成员2'],
        failed: [],
        validation: {
          valid: ['新成员1', '新成员2'],
          duplicates: [],
          invalid: []
        }
      } as any)

      await aiController.addMembers(mockReq as AuthenticatedRequest, mockRes as Response)

      // 验证权限检查
      expect(mockedTripService.getTripMembers).toHaveBeenCalled()
      
      // 验证调用了handleMemberAddition，传递的是userId（因为是添加操作的发起者）
      expect(mockedParser.handleMemberAddition).toHaveBeenCalledWith(
        mockTripId,
        ['新成员1', '新成员2'],
        mockUserId // 这里传递userId是正确的，因为是记录谁添加的成员
      )
      
      expect(sendSuccess).toHaveBeenCalled()
    })

    it('应该拒绝非管理员的添加请求', async () => {
      mockReq.body = {
        tripId: mockTripId,
        memberNames: ['新成员1']
      }

      // 修改当前用户为普通成员
      const nonAdminMembers = mockMembers.map(m => 
        m.userId === mockUserId ? { ...m, role: 'member' } : m
      )

      const mockedTripService = tripService as jest.Mocked<typeof tripService>
      mockedTripService.getTripDetail.mockResolvedValue({ id: mockTripId, name: 'Test Trip' } as any)
      mockedTripService.getTripMembers.mockResolvedValue(nonAdminMembers as any)

      await aiController.addMembers(mockReq as AuthenticatedRequest, mockRes as Response)

      expect(sendError).toHaveBeenCalledWith(
        mockRes,
        '403',
        '只有管理员可以添加成员',
        403
      )
      
      // 不应该调用handleMemberAddition
      const mockedParser = unifiedAIParser as jest.Mocked<typeof unifiedAIParser>
      expect(mockedParser.handleMemberAddition).not.toHaveBeenCalled()
    })
  })
})