import { useCallback } from 'react'
import { Toast } from 'antd-mobile'
import { Form } from 'antd-mobile'
import { useExpenseStore } from '@/stores/expense.store'
import aiService from '@/services/ai.service'
import contributionService from '@/services/contribution.service'
import { formatCurrency } from '@/utils/format'
import type { ParsedExpense } from './useIntentHandlers'
import type { Message } from './useAIChat'

interface UseExpenseFormProps {
  tripId: string | undefined
  members: any[]
  selectedMembers: string[]
  parsedData?: ParsedExpense | null
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => Message
  setShowConfirmDialog: (show: boolean) => void
  setParsedData: (data: ParsedExpense | null) => void
  fetchTripDetail: (tripId: string) => Promise<void>
}

export const useExpenseForm = ({
  tripId,
  members,
  selectedMembers,
  addMessage,
  setShowConfirmDialog,
  setParsedData,
  fetchTripDetail
}: UseExpenseFormProps) => {
  const { createExpense } = useExpenseStore()
  const [form] = Form.useForm()

  // 提交费用记录
  const handleSubmitExpense = useCallback(async () => {
    try {
      await form.validateFields()
      const values = form.getFieldsValue()
      
      // 构建支出数据
      const amount = parseFloat(values.amount)
      const finalAmount = Math.abs(amount)  // 金额永远是正数
      
      // 构建参与者数据 - 只包含选中的成员
      const participantList = selectedMembers.map(memberId => {
        return {
          memberId,
          shareAmount: finalAmount / selectedMembers.length
        }
      })
      
      const expenseData = {
        amount: finalAmount,
        description: values.description,
        payerId: values.payerMemberId,  // 修正字段名
        payerMemberId: values.payerMemberId,
        expenseDate: values.expenseDate.toISOString(),
        categoryId: values.categoryId,
        participants: participantList
      }

      await createExpense(tripId!, expenseData)
      
      Toast.show('记账成功！')
      setShowConfirmDialog(false)
      
      // 添加成功消息
      addMessage({
        type: 'system',
        content: `✅ 消费记录成功！已记录 ${formatCurrency(Math.abs(finalAmount))} 的消费。`
      })
      
      // 清空解析数据
      setParsedData(null)
      
    } catch (error: any) {
      Toast.show(error.message || '记账失败')
    }
  }, [tripId, members, selectedMembers, form, createExpense, addMessage, setShowConfirmDialog, setParsedData])

  // 提交基金缴纳
  const handleFundContributionSubmit = useCallback(async (data: any) => {
    console.log('=== handleFundContributionSubmit开始执行 ===')
    console.log('接收到的data:', data)
    
    try {
      // 处理基金缴纳逻辑，注意数据结构：IncomeConfirm传递的是contributors，不是participants
      const contributorsData = data.contributors || data.participants || []
      console.log('contributorsData:', contributorsData)
      
      const updates = contributorsData.map((p: any) => {
        const member = members.find(m => 
          (m.isVirtual && m.displayName === p.username) || 
          (!m.isVirtual && m.user?.username === p.username)
        )
        
        if (!member) {
          throw new Error(`找不到成员：${p.username}`)
        }
        
        return {
          memberId: member.id,
          contribution: p.shareAmount || p.amount || 0  // 兼容两种字段名
        }
      })
      
      // 批量更新成员基金缴纳
      console.log('准备批量更新基金缴纳:', updates)
      await contributionService.batchUpdateContributions(tripId!, updates)
      
      Toast.show('基金缴纳成功！')
      setShowConfirmDialog(false)
      
      // 刷新行程详情
      if (tripId) {
        await fetchTripDetail(tripId)
      }
      
      // 添加成功消息
      addMessage({
        type: 'system',
        content: `✅ 基金缴纳成功！总计缴纳 ${formatCurrency(data.totalAmount)} 元。`
      })
      
      setParsedData(null)
      
    } catch (error: any) {
      Toast.show(error.message || '基金缴纳失败')
    }
  }, [tripId, members, addMessage, setShowConfirmDialog, setParsedData, fetchTripDetail])

  // 处理成员确认
  const handleMemberConfirm = useCallback(async (memberNames: string[]) => {
    try {
      const result = await aiService.addMembers(tripId!, memberNames)
      
      if (result.success) {
        let message = `✅ 成功添加 ${result.added.length} 个成员！`
        
        if (result.failed.length > 0) {
          message += `\n❌ ${result.failed.length} 个添加失败`
        }
        
        Toast.show(message)
        
        addMessage({
          type: 'system',
          content: message
        })
        
        // 刷新成员列表
        if (tripId) {
          await fetchTripDetail(tripId)
        }
      }
    } catch (error: any) {
      Toast.show(error.message || '添加成员失败')
    }
  }, [tripId, addMessage, fetchTripDetail])

  // 处理混合意图确认
  const handleMixedConfirmExpense = useCallback(async () => {
    await handleSubmitExpense()
  }, [handleSubmitExpense])

  const handleMixedConfirmMembers = useCallback(async (memberNames: string[]) => {
    await handleMemberConfirm(memberNames)
  }, [handleMemberConfirm])

  const handleMixedConfirmBoth = useCallback(async (_expenseData: any, memberNames: string[]) => {
    await handleMemberConfirm(memberNames)
    await handleSubmitExpense()
  }, [handleMemberConfirm, handleSubmitExpense])

  return {
    form,
    handleSubmitExpense,
    handleFundContributionSubmit,
    handleMemberConfirm,
    handleMixedConfirmExpense,
    handleMixedConfirmMembers,
    handleMixedConfirmBoth
  }
}