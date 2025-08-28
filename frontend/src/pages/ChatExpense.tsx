import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  NavBar,
  Dialog,
  Form,
  Selector,
  DatePicker,
  Checkbox,
  Space,
  Toast
} from 'antd-mobile'
import { useTripStore } from '@/stores/trip.store'
import { useAuthStore } from '@/stores/auth.store'
import { MemberConfirm, MixedIntentConfirm, IncomeConfirm } from '@/components/confirmation'
import { ChatMessages, ChatInput, TripSelector } from '@/components/chat'
import { useAIChat, useIntentHandlers, useExpenseForm } from '@/hooks/chat'
import './ChatExpense.scss'

const ChatExpense: React.FC = () => {
  const { id: tripId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { trips, members, fetchTrips, fetchTripDetail, fetchMembers } = useTripStore()
  const {} = useAuthStore()
  
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

  useEffect(() => {
    fetchTrips()
  }, [])

  const loadData = async () => {
    try {
      await fetchTripDetail(tripId!)
      await fetchMembers(tripId!)
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
      <Dialog
        visible={showConfirmDialog}
        title="确认消费信息"
        content={
          <Form form={form} layout="vertical">
            <Form.Item 
              name="amount" 
              label="金额" 
              initialValue={parsedData?.amount?.toString()}
              rules={[{ required: true, message: '请输入金额' }]}
            >
              <input type="number" placeholder="请输入金额" />
            </Form.Item>
            
            <Form.Item 
              name="description" 
              label="描述" 
              initialValue={parsedData?.description}
            >
              <input type="text" placeholder="请输入描述" />
            </Form.Item>
            
            <Form.Item 
              name="payerMemberId" 
              label="付款人" 
              initialValue={parsedData?.payerId}
              rules={[{ required: true, message: '请选择付款人' }]}
            >
              <Selector
                options={members.map(m => ({
                  label: m.isVirtual ? m.displayName : m.user?.username,
                  value: m.id
                }))}
              />
            </Form.Item>
            
            <Form.Item 
              name="expenseDate" 
              label="日期" 
              initialValue={new Date()}
              trigger="onConfirm"
              rules={[{ required: true, message: '请选择日期' }]}
            >
              <DatePicker>
                {value => value ? value.toLocaleDateString() : '请选择日期'}
              </DatePicker>
            </Form.Item>
            
            <Form.Item label="参与者">
              <Checkbox.Group
                value={selectedMembers}
                onChange={(val) => setSelectedMembers(val as string[])}
              >
                <Space wrap>
                  {members.map(member => (
                    <Checkbox key={member.id} value={member.id}>
                      {member.isVirtual ? member.displayName : member.user?.username}
                    </Checkbox>
                  ))}
                </Space>
              </Checkbox.Group>
            </Form.Item>
          </Form>
        }
        closeOnAction
        actions={[
          {
            key: 'cancel',
            text: '取消',
            onClick: () => {
              setShowConfirmDialog(false)
              setParsedData(null)
            }
          },
          {
            key: 'confirm',
            text: '确认',
            bold: true,
            onClick: handleConfirm
          }
        ]}
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
      <ChatMessages messages={messages} />
      
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
        onConfirm={handleMemberConfirm}
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