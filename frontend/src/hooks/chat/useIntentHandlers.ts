import { useState, useCallback } from 'react'
import { formatCurrency } from '@/utils/format'
import type { Message, ParseResult } from './useAIChat'

export interface ParsedExpense {
  amount?: number
  perPersonAmount?: number
  description?: string
  participants?: Array<{
    userId: string
    username: string
    shareAmount?: number
    sharePercentage?: number
    individualAmount?: number
  }>
  excludedMembers?: string[]
  category?: string
  confidence: number
  payerId?: string
  payerName?: string
  consumptionDate?: string  // 实际消费日期
  isContribution?: boolean
}

interface UseIntentHandlersProps {
  members: any[]
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => Message
}

export const useIntentHandlers = ({ members, addMessage }: UseIntentHandlersProps) => {
  const [parsedData, setParsedData] = useState<ParsedExpense | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showMemberConfirm, setShowMemberConfirm] = useState(false)
  const [showMixedConfirm, setShowMixedConfirm] = useState(false)

  // 处理费用意图
  const handleExpenseIntent = useCallback(async (data: ParsedExpense) => {
    if (!data) {
      addMessage({
        type: 'ai',
        content: '解析失败，请重试。'
      })
      return
    }
    
    setParsedData(data)
    
    // 设置参与者
    if (data.participants && data.participants.length > 0) {
      const memberIds = data.participants.map(p => {
        const member = members.find(m => 
          (m.isVirtual && m.displayName === p.username) || 
          (!m.isVirtual && m.user?.username === p.username)
        )
        return member?.id
      }).filter(Boolean) as string[]
      setSelectedMembers(memberIds)
    } else if (data.excludedMembers) {
      const excludedNames = data.excludedMembers
      const excludedIds = excludedNames.map(name => {
        const member = members.find(m => 
          (m.isVirtual && m.displayName === name) || 
          (!m.isVirtual && m.user?.username === name)
        )
        return member?.id
      }).filter(Boolean) as string[]
      setSelectedMembers(members
        .filter(m => !excludedIds.includes(m.id))
        .map(m => m.id))
    } else {
      setSelectedMembers(members.map(m => m.id))
    }
    
    let responseContent = `✅ 我理解了你的消费信息：\n\n`
    
    if (data.amount) {
      const displayAmount = Math.abs(data.amount)
      responseContent += `💰 金额：${formatCurrency(displayAmount)}\n`
    }
    
    if (data.payerId) {
      const payer = members.find(m => m.id === data.payerId)
      if (payer) {
        const payerName = payer.isVirtual ? payer.displayName : payer.user?.username
        const isAdmin = payer.role === 'admin'
        responseContent += `💳 付款人：${payerName}${isAdmin ? '（基金池）' : '（垫付）'}\n`
      }
    }
    
    if (data.category) {
      responseContent += `📋 类别：${data.category}\n`
    }
    
    if (data.participants && data.participants.length > 0) {
      responseContent += `👥 参与者：${data.participants.map(p => p.username).join('、')}\n`
    }
    
    responseContent += `\n🎯 置信度：${(data.confidence * 100).toFixed(0)}%\n\n点击"确认记账"按钮来完善详细信息并提交。`
    
    addMessage({
      type: 'ai',
      content: responseContent,
      data
    })
    
    setShowConfirmDialog(true)
  }, [members, addMessage])

  // 处理基金缴纳
  const handleContribution = useCallback(async (data: any) => {
    if (!data) {
      addMessage({
        type: 'ai',
        content: '解析失败，请重试。'
      })
      return
    }
    
    setParsedData(data)
    
    // 设置所有成员参与
    setSelectedMembers(members.map(m => m.id))
    
    let responseContent = `✅ 我理解了你的基金缴纳信息：\n\n`
    
    if (data.amount) {
      responseContent += `💰 总金额：${formatCurrency(data.amount)}\n`
    }
    
    if (data.participants && data.participants.length > 0) {
      responseContent += `👥 缴纳详情：\n`
      data.participants.forEach((p: any) => {
        responseContent += `  • ${p.username}：${formatCurrency(p.shareAmount || 0)}\n`
      })
    }
    
    responseContent += `\n请确认基金缴纳信息。`
    
    addMessage({
      type: 'ai',
      content: responseContent,
      data
    })
    
    setShowConfirmDialog(true)
  }, [members, addMessage])

  // 处理成员意图
  const handleMemberIntent = useCallback(async (data: any) => {
    if (!data.members || data.members.length === 0) {
      addMessage({
        type: 'ai',
        content: '没有识别到有效的成员名称，请重新输入。'
      })
      return
    }
    
    const memberNames = data.members.map((m: any) => m.displayName)
    let responseContent = `✅ 我理解你要添加以下成员：\n\n`
    responseContent += memberNames.map((name: string) => `• ${name}`).join('\n')
    responseContent += `\n\n共 ${memberNames.length} 个新成员。`
    responseContent += `\n🎯 置信度：${(data.confidence * 100).toFixed(0)}%`
    
    addMessage({
      type: 'ai',
      content: responseContent,
      data
    })
    
    setShowMemberConfirm(true)
  }, [addMessage])

  // 处理混合意图
  const handleMixedIntent = useCallback(async (data: any) => {
    if (!data) {
      addMessage({
        type: 'ai',
        content: '解析失败，请重试。'
      })
      return
    }

    let responseContent = `✅ 我理解了你的混合请求：\n\n`
    
    if (data && data.expense && data.expense.amount) {
      responseContent += `💰 支出: ${formatCurrency(Math.abs(data.expense.amount))}\n`
    }
    
    if (data && data.members && data.members.members && data.members.members.length > 0) {
      responseContent += `👥 新成员: ${data.members.members.map((m: any) => m.displayName).join('、')}\n`
    }
    
    responseContent += `\n您可以选择同时执行，或分别处理。`
    
    addMessage({
      type: 'ai',
      content: responseContent,
      data
    })
    
    setShowMixedConfirm(true)
  }, [addMessage])

  // 处理结算意图
  const handleSettlement = useCallback(async () => {
    addMessage({
      type: 'ai',
      content: '结算功能正在开发中，敬请期待！'
    })
  }, [addMessage])

  // 处理未知意图
  const handleUnknown = useCallback(() => {
    addMessage({
      type: 'ai',
      content: '抱歉，我没有理解您的意思。请尝试更清楚地描述，比如：\n• "昨天吃饭花了200元"\n• "添加张三李四两个成员"\n• "每人预存5000元基金"'
    })
  }, [addMessage])

  // 统一的意图处理入口
  const handleIntent = useCallback(async (result: ParseResult) => {
    if (!result || !result.intent) {
      handleUnknown()
      return
    }

    switch (result.intent.intent) {
      case 'expense':
        await handleExpenseIntent(result.data)
        break
      case 'contribution':
        await handleContribution(result.data)
        break
      case 'member':
        await handleMemberIntent(result.data)
        break
      case 'mixed':
        await handleMixedIntent(result.data)
        break
      case 'settlement':
        await handleSettlement()
        break
      default:
        handleUnknown()
    }
  }, [handleExpenseIntent, handleContribution, handleMemberIntent, handleMixedIntent, handleSettlement, handleUnknown])

  return {
    parsedData,
    selectedMembers,
    showConfirmDialog,
    showMemberConfirm,
    showMixedConfirm,
    setParsedData,
    setSelectedMembers,
    setShowConfirmDialog,
    setShowMemberConfirm,
    setShowMixedConfirm,
    handleIntent
  }
}