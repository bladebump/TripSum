import { useState, useCallback } from 'react'
import { Toast } from 'antd-mobile'
import aiService from '@/services/ai.service'

export interface Message {
  id: string
  type: 'user' | 'ai' | 'system'
  content: string
  timestamp: Date
  data?: any
}

export interface ParseResult {
  intent: {
    intent: 'expense' | 'member' | 'settlement' | 'mixed' | 'unknown' | 'contribution' | 'income'
    confidence: number
  }
  data: any
  confidence: number
}

export const useAIChat = (tripId: string | undefined, members: any[]) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content: `👋 你好！我是你的AI记账助手。\n\n请告诉我这次消费的情况，比如：\n• "昨天晚餐花了200元，我和张三李四一起吃的"\n• "我代付了打车费100元"\n• "每人预存5000元基金"\n• "添加小明小红两个成员"`,
      timestamp: new Date()
    }
  ])
  const [loading, setLoading] = useState(false)
  const [currentParseResult, setCurrentParseResult] = useState<ParseResult | null>(null)

  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
    return newMessage
  }, [])

  const parseUserInput = useCallback(async (userMessage: string): Promise<ParseResult | null> => {
    if (!tripId) {
      Toast.show('请先选择行程')
      return null
    }

    setLoading(true)
    try {
      const result = await aiService.parseUserInput(tripId, userMessage, members)
      
      if (result.confidence > 0.3) {
        setCurrentParseResult(result)
        return result
      } else {
        addMessage({
          type: 'ai',
          content: '抱歉，我没有理解您的意思。请尝试用更清楚的方式描述。'
        })
        return null
      }
    } catch (error) {
      console.error('AI解析失败:', error)
      addMessage({
        type: 'ai',
        content: '解析失败，请重试。'
      })
      return null
    } finally {
      setLoading(false)
    }
  }, [tripId, members, addMessage])

  const clearCurrentResult = useCallback(() => {
    setCurrentParseResult(null)
  }, [])

  return {
    messages,
    loading,
    currentParseResult,
    addMessage,
    parseUserInput,
    clearCurrentResult
  }
}