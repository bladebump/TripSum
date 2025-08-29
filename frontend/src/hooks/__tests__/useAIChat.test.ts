import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAIChat } from '../chat/useAIChat'
import aiService from '@/services/ai.service'

// Mock AI service
vi.mock('@/services/ai.service', () => ({
  default: {
    parseExpenseText: vi.fn()
  }
}))

// Mock stores
vi.mock('@/stores/trip.store', () => ({
  useTripStore: () => ({
    members: [
      { id: 'm1', user: { username: '张三' }, isVirtual: false },
      { id: 'm2', displayName: '虚拟李四', isVirtual: true }
    ]
  })
}))

describe('useAIChat Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该初始化默认状态', () => {
    const { result } = renderHook(() => useAIChat('trip123'))

    expect(result.current.messages).toEqual([])
    expect(result.current.inputText).toBe('')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.parsedData).toBeNull()
  })

  it('应该更新输入文本', () => {
    const { result } = renderHook(() => useAIChat('trip123'))

    act(() => {
      result.current.handleInputChange('测试文本')
    })

    expect(result.current.inputText).toBe('测试文本')
  })

  it('应该发送消息并解析支出', async () => {
    const mockResponse = {
      intent: 'expense',
      data: {
        amount: 100,
        description: '午餐',
        payerName: '张三',
        participants: ['张三', '虚拟李四']
      }
    }

    vi.mocked(aiService.parseExpenseText).mockResolvedValueOnce(mockResponse)

    const { result } = renderHook(() => useAIChat('trip123'))

    act(() => {
      result.current.handleInputChange('张三付了100元午餐')
    })

    await act(async () => {
      await result.current.handleSendMessage()
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
      expect(result.current.messages[0].type).toBe('user')
      expect(result.current.messages[0].content).toBe('张三付了100元午餐')
      expect(result.current.messages[1].type).toBe('assistant')
      expect(result.current.parsedData).toEqual(mockResponse)
      expect(result.current.inputText).toBe('')
    })
  })

  it('应该处理基金缴纳意图', async () => {
    const mockResponse = {
      intent: 'income',
      data: {
        contributions: [
          { username: '张三', amount: 500 }
        ]
      }
    }

    vi.mocked(aiService.parseExpenseText).mockResolvedValueOnce(mockResponse)

    const { result } = renderHook(() => useAIChat('trip123'))

    act(() => {
      result.current.handleInputChange('张三缴纳500元基金')
    })

    await act(async () => {
      await result.current.handleSendMessage()
    })

    await waitFor(() => {
      expect(result.current.parsedData?.intent).toBe('income')
      expect(result.current.parsedData?.data.contributions).toHaveLength(1)
    })
  })

  it('应该处理添加成员意图', async () => {
    const mockResponse = {
      intent: 'member',
      data: {
        memberNames: ['王五', '赵六']
      }
    }

    vi.mocked(aiService.parseExpenseText).mockResolvedValueOnce(mockResponse)

    const { result } = renderHook(() => useAIChat('trip123'))

    act(() => {
      result.current.handleInputChange('添加成员王五和赵六')
    })

    await act(async () => {
      await result.current.handleSendMessage()
    })

    await waitFor(() => {
      expect(result.current.parsedData?.intent).toBe('member')
      expect(result.current.parsedData?.data.memberNames).toEqual(['王五', '赵六'])
    })
  })

  it('应该处理混合意图', async () => {
    const mockResponse = {
      intent: 'mixed',
      data: {
        expenses: [{
          amount: 200,
          description: '晚餐',
          payerName: '张三',
          participants: ['张三', '虚拟李四']
        }],
        contributions: [{
          username: '虚拟李四',
          amount: 300
        }]
      }
    }

    vi.mocked(aiService.parseExpenseText).mockResolvedValueOnce(mockResponse)

    const { result } = renderHook(() => useAIChat('trip123'))

    act(() => {
      result.current.handleInputChange('张三请客200元晚餐，李四缴纳300元')
    })

    await act(async () => {
      await result.current.handleSendMessage()
    })

    await waitFor(() => {
      expect(result.current.parsedData?.intent).toBe('mixed')
      expect(result.current.parsedData?.data.expenses).toHaveLength(1)
      expect(result.current.parsedData?.data.contributions).toHaveLength(1)
    })
  })

  it('应该处理解析错误', async () => {
    vi.mocked(aiService.parseExpenseText).mockRejectedValueOnce(new Error('解析失败'))

    const { result } = renderHook(() => useAIChat('trip123'))

    act(() => {
      result.current.handleInputChange('无效文本')
    })

    await act(async () => {
      await result.current.handleSendMessage()
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
      expect(result.current.messages[1].content).toContain('抱歉')
      expect(result.current.parsedData).toBeNull()
    })
  })

  it('应该清空消息历史', () => {
    const { result } = renderHook(() => useAIChat('trip123'))

    // 先添加一些消息
    act(() => {
      result.current.setMessages([
        { type: 'user', content: '测试1' },
        { type: 'assistant', content: '回复1' }
      ])
    })

    expect(result.current.messages).toHaveLength(2)

    // 清空消息
    act(() => {
      result.current.handleClearMessages()
    })

    expect(result.current.messages).toEqual([])
    expect(result.current.parsedData).toBeNull()
  })

  it('应该正确设置加载状态', async () => {
    let resolvePromise: (value: any) => void
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    vi.mocked(aiService.parseExpenseText).mockReturnValueOnce(promise as any)

    const { result } = renderHook(() => useAIChat('trip123'))

    act(() => {
      result.current.handleInputChange('测试')
    })

    const sendPromise = act(async () => {
      await result.current.handleSendMessage()
    })

    // 检查加载状态
    expect(result.current.isLoading).toBe(true)

    // 解析完成
    act(() => {
      resolvePromise!({
        intent: 'expense',
        data: { amount: 100 }
      })
    })

    await sendPromise

    expect(result.current.isLoading).toBe(false)
  })
})