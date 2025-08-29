import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  NavBar,
  Dialog,
  Form,
  Input,
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
import '@/components/confirmation/ConfirmDialog.scss'

const ChatExpense: React.FC = () => {
  const { id: tripId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { trips, members, fetchTrips, fetchTripDetail } = useTripStore()
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
      <Dialog
        visible={showConfirmDialog}
        className="confirm-dialog"
        title={
          <div style={{
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%)',
            padding: '20px',
            margin: '-16px -16px 0',
            color: 'white',
            fontSize: '18px',
            fontWeight: 600,
            textAlign: 'center',
            borderRadius: '12px 12px 0 0'
          }}>
            💳 确认消费信息
          </div>
        }
        content={
          <div className="confirm-dialog-content" style={{ padding: '20px 0' }}>
          <Form form={form} layout="vertical">
            <div style={{
              marginBottom: '20px',
              padding: '16px',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                💰 消费金额
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '20px',
                  color: '#ff6b6b',
                  fontWeight: 600,
                  zIndex: 1
                }}>¥</span>
                <Form.Item 
                  name="amount" 
                  initialValue={parsedData?.amount?.toString()}
                  rules={[{ required: true, message: '请输入金额' }]}
                  style={{ marginBottom: 0 }}
                >
                  <Input 
                    type="number" 
                    placeholder="0.00"
                    style={{
                      paddingLeft: '40px',
                      fontSize: '24px',
                      fontWeight: 600,
                      color: '#ff6b6b',
                      textAlign: 'center',
                      height: '56px',
                      background: '#fff5f5',
                      border: '2px solid #ffebeb',
                      borderRadius: '12px'
                    }}
                  />
                </Form.Item>
              </div>
            </div>
            
            <Form.Item 
              name="description" 
              label="描述" 
              initialValue={parsedData?.description}
            >
              <Input placeholder="请输入描述" />
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
          </div>
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