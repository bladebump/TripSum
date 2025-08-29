import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAIChat, type ParseResult } from '../chat/useAIChat'
import aiService from '@/services/ai.service'

// Mock AI service
vi.mock('@/services/ai.service', () => ({
  default: {
    parseUserInput: vi.fn()
  }
}))

// 移除store mock，因为hook现在接受members作为参数

describe('useAIChat Hook', () => {
  const mockMembers = [
    { id: 'm1', user: { username: '张三' }, isVirtual: false },
    { id: 'm2', displayName: '虚拟李四', isVirtual: true }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该初始化默认状态', () => {
    const { result } = renderHook(() => useAIChat('trip123', mockMembers))

    expect(result.current.messages).toHaveLength(1) // 有一条系统消息
    expect(result.current.messages[0].type).toBe('system')
    expect(result.current.loading).toBe(false)
    expect(result.current.currentParseResult).toBeNull()
  })

  it('应该添加新消息', () => {
    const { result } = renderHook(() => useAIChat('trip123', mockMembers))

    act(() => {
      result.current.addMessage({
        type: 'user',
        content: '测试文本'
      })
    })

    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[1].content).toBe('测试文本')
  })

  it('应该发送消息并解析支出', async () => {
    const mockResponse = {
      intent: {
        intent: 'expense' as const,
        confidence: 0.9
      },
      data: {
        amount: 100,
        description: '午餐',
        payerName: '张三',
        participants: ['张三', '虚拟李四']
      },
      confidence: 0.9
    }

    vi.mocked(aiService.parseUserInput).mockResolvedValueOnce(mockResponse)

    const { result } = renderHook(() => useAIChat('trip123', mockMembers))

    await act(async () => {
      await result.current.parseUserInput('张三付了100元午餐')
    })

    await waitFor(() => {
      expect(result.current.currentParseResult).toEqual(mockResponse)
    })
  })

  it('应该处理基金缴纳意图', async () => {
    const mockResponse: ParseResult = {
      intent: {
        intent: 'contribution',
        confidence: 0.9
      },
      data: {
        contributions: [
          { username: '张三', amount: 500 }
        ]
      },
      confidence: 0.9
    }

    vi.mocked(aiService.parseUserInput).mockResolvedValueOnce(mockResponse)

    const { result } = renderHook(() => useAIChat('trip123', mockMembers))

    await act(async () => {
      await result.current.parseUserInput('张三缴纳500元基金')
    })

    await waitFor(() => {
      expect(result.current.currentParseResult?.intent.intent).toBe('contribution')
      expect(result.current.currentParseResult?.data.contributions).toHaveLength(1)
    })
  })

  it('应该处理添加成员意图', async () => {
    const mockResponse = {
      intent: {
        intent: 'member' as const,
        confidence: 0.9
      },
      data: {
        memberNames: ['王五', '赵六']
      },
      confidence: 0.9
    }

    vi.mocked(aiService.parseUserInput).mockResolvedValueOnce(mockResponse)

    const { result } = renderHook(() => useAIChat('trip123', mockMembers))

    await act(async () => {
      await result.current.parseUserInput('添加成员王五和赵六')
    })

    await waitFor(() => {
      expect(result.current.currentParseResult?.intent.intent).toBe('member')
      expect(result.current.currentParseResult?.data.memberNames).toEqual(['王五', '赵六'])
    })
  })

  it('应该处理混合意图', async () => {
    const mockResponse = {
      intent: {
        intent: 'mixed' as const,
        confidence: 0.9
      },
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
      },
      confidence: 0.9
    }

    vi.mocked(aiService.parseUserInput).mockResolvedValueOnce(mockResponse)

    const { result } = renderHook(() => useAIChat('trip123', mockMembers))

    await act(async () => {
      await result.current.parseUserInput('张三请客200元晚餐，李四缴纳300元')
    })

    await waitFor(() => {
      expect(result.current.currentParseResult?.intent.intent).toBe('mixed')
      expect(result.current.currentParseResult?.data.expenses).toHaveLength(1)
      expect(result.current.currentParseResult?.data.contributions).toHaveLength(1)
    })
  })

  it('应该处理解析错误', async () => {
    vi.mocked(aiService.parseUserInput).mockRejectedValueOnce(new Error('解析失败'))

    const { result } = renderHook(() => useAIChat('trip123', mockMembers))

    await act(async () => {
      await result.current.parseUserInput('无效文本')
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
      expect(result.current.messages[1].content).toContain('解析失败')
      expect(result.current.currentParseResult).toBeNull()
    })
  })

  it('应该清空当前解析结果', async () => {
    const mockResponse = {
      intent: {
        intent: 'expense' as const,
        confidence: 0.9
      },
      data: { amount: 100 },
      confidence: 0.9
    }

    vi.mocked(aiService.parseUserInput).mockResolvedValueOnce(mockResponse)

    const { result } = renderHook(() => useAIChat('trip123', mockMembers))

    // 先解析一些内容
    await act(async () => {
      await result.current.parseUserInput('测试')
    })

    expect(result.current.currentParseResult).not.toBeNull()

    // 清空解析结果
    act(() => {
      result.current.clearCurrentResult()
    })

    expect(result.current.currentParseResult).toBeNull()
  })

  it('应该正确设置加载状态', async () => {
    let resolvePromise: (value: any) => void
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    vi.mocked(aiService.parseUserInput).mockReturnValueOnce(promise as any)

    const { result } = renderHook(() => useAIChat('trip123', mockMembers))

    // 开始解析
    const parsePromise = act(async () => {
      await result.current.parseUserInput('测试')
    })

    // 检查加载状态
    expect(result.current.loading).toBe(true)

    // 解析完成
    act(() => {
      resolvePromise!({
        intent: {
          intent: 'expense' as const,
          confidence: 0.9
        },
        data: { amount: 100 },
        confidence: 0.9
      })
    })

    await parsePromise

    expect(result.current.loading).toBe(false)
  })
})