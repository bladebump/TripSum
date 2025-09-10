import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  NavBar,
  Toast
} from 'antd-mobile'
import { useTripStore } from '@/stores/trip.store'
import { useAuthStore } from '@/stores/auth.store'
import { canCreateExpense, getPermissionDeniedMessage } from '@/utils/permission'
import { MemberConfirm, MixedIntentConfirm, IncomeConfirm, ExpenseConfirmDialog } from '@/components/confirmation'
import { ChatMessages, ChatInput, TripSelector } from '@/components/chat'
import { useAIChat, useIntentHandlers, useExpenseForm } from '@/hooks/chat'
import './ChatExpense.scss'
import '@/components/confirmation/ConfirmDialog.scss'

const ChatExpense: React.FC = () => {
  const { id: tripId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { trips, members, currentTrip, fetchTrips, fetchTripDetail } = useTripStore()
  const { user } = useAuthStore()
  
  const [inputValue, setInputValue] = useState('')

  // 使用自定义hooks
  const {
    messages,
    loading,
    currentParseResult,
    addMessage,
    parseUserInput,
    clearCurrentResult
  } = useAIChat(tripId, members)

  const {
    parsedData,
    selectedMembers,
    showConfirmDialog,
    showMemberConfirm,
    showMixedConfirm,
    setShowConfirmDialog,
    setShowMemberConfirm,
    setShowMixedConfirm,
    setParsedData,
    setSelectedMembers,
    handleIntent
  } = useIntentHandlers({
    members,
    addMessage
  })

  const {
    form,
    handleSubmitExpense,
    handleFundContributionSubmit,
    handleMemberConfirm,
    handleMixedConfirmExpense,
    handleMixedConfirmMembers,
    handleMixedConfirmBoth
  } = useExpenseForm({
    tripId,
    members,
    selectedMembers,
    parsedData,
    addMessage,
    setShowConfirmDialog,
    setParsedData,
    fetchTripDetail
  })

  // 加载数据
  useEffect(() => {
    if (tripId) {
      loadData()
    }
  }, [tripId])

  // 检查权限
  useEffect(() => {
    if (members.length > 0 && user) {
      const currentMember = members.find(m => m.userId === user.id)
      if (!canCreateExpense(currentMember)) {
        Toast.show({
          content: getPermissionDeniedMessage('createExpense'),
          afterClose: () => navigate(-1)
        })
      }
    }
  }, [members, user, navigate])

  useEffect(() => {
    fetchTrips()
  }, [])

  const loadData = async () => {
    try {
      // fetchTripDetail 现在会同时获取成员信息
      await fetchTripDetail(tripId!)
    } catch (error) {
      console.error('加载数据失败:', error)
      Toast.show('加载数据失败')
    }
  }

  // 处理发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || loading) return
    if (!tripId) {
      Toast.show('请先选择行程')
      return
    }

    const userMessage = inputValue.trim()
    setInputValue('')
    
    // 添加用户消息
    addMessage({
      type: 'user',
      content: userMessage
    })

    // 解析用户输入
    const result = await parseUserInput(userMessage)
    if (result) {
      await handleIntent(result)
    }
  }

  // 处理行程切换
  const handleTripChange = () => {
    // 切换行程时清空当前状态
    clearCurrentResult()
    setParsedData(null)
  }

  // 处理确认对话框
  const handleConfirm = async () => {
    if (!parsedData) return

    // 根据意图类型处理
    if (currentParseResult?.intent.intent === 'contribution') {
      await handleFundContributionSubmit(parsedData)
    } else {
      await handleSubmitExpense()
    }
  }

  // 渲染确认对话框
  const renderConfirmDialog = () => {
    if (currentParseResult?.intent.intent === 'contribution') {
      return (
        <IncomeConfirm
          visible={showConfirmDialog}
          data={parsedData}
          members={members}
          tripId={tripId!}
          onConfirm={handleFundContributionSubmit}
          onCancel={() => {
            setShowConfirmDialog(false)
            setParsedData(null)
          }}
        />
      )
    }

    return (
      <ExpenseConfirmDialog
        visible={showConfirmDialog}
        form={form}
        parsedData={parsedData}
        members={members}
        categories={currentTrip?.categories}
        selectedMembers={selectedMembers}
        onSelectedMembersChange={setSelectedMembers}
        onConfirm={handleConfirm}
        onCancel={() => {
          setShowConfirmDialog(false)
          setParsedData(null)
        }}
      />
    )
  }

  return (
    <div className="chat-expense-page">
      <NavBar onBack={() => navigate(-1)}>AI记账助手</NavBar>
      
      {/* 行程选择器 */}
      <TripSelector 
        trips={trips} 
        currentTripId={tripId}
        onTripChange={handleTripChange}
      />
      
      {/* 消息列表 */}
      <ChatMessages messages={messages} loading={loading} />
      
      {/* 输入框 */}
      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        loading={loading}
        disabled={!tripId}
      />
      
      {/* 确认对话框 */}
      {renderConfirmDialog()}
      
      {/* 成员确认对话框 */}
      <MemberConfirm
        visible={showMemberConfirm}
        title="添加新成员"
        members={currentParseResult?.data?.members || []}
        onClose={() => setShowMemberConfirm(false)}
        onConfirm={async (memberNames) => {
          await handleMemberConfirm(memberNames)
          setShowMemberConfirm(false)  // 添加成功后关闭弹窗
        }}
      />
      
      {/* 混合意图确认对话框 */}
      <MixedIntentConfirm
        visible={showMixedConfirm}
        data={currentParseResult?.data}
        onClose={() => setShowMixedConfirm(false)}
        onConfirmExpense={handleMixedConfirmExpense}
        onConfirmMembers={handleMixedConfirmMembers}
        onConfirmBoth={handleMixedConfirmBoth}
      />
    </div>
  )
}

export default ChatExpense