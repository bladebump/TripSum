import React, { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  NavBar,
  Input,
  Button,
  Toast,
  Dialog,
  Form,
  Selector,
  DatePicker
} from 'antd-mobile'
import { SendOutline } from 'antd-mobile-icons'
import { useTripStore } from '@/stores/trip.store'
import { useExpenseStore } from '@/stores/expense.store'
import { useAuthStore } from '@/stores/auth.store'
import aiService from '@/services/ai.service'
import { formatDate, formatCurrency } from '@/utils/format'
import { MemberConfirm, MixedIntentConfirm } from '@/components/confirmation'
import './ChatExpense.scss'

interface Message {
  id: string
  type: 'user' | 'ai' | 'system'
  content: string
  timestamp: Date
  data?: any // AI解析的数据
}

interface ParsedExpense {
  amount?: number
  description?: string
  participants?: Array<{
    userId: string
    username: string
    shareAmount?: number
    sharePercentage?: number
  }>
  category?: string
  confidence: number
  isIncome?: boolean
}

interface ParseResult {
  intent: {
    intent: 'expense' | 'member' | 'settlement' | 'mixed' | 'unknown'
    confidence: number
  }
  data: any
  confidence: number
}

const ChatExpense: React.FC = () => {
  const { id: tripId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentTrip, members, fetchTripDetail, fetchMembers } = useTripStore()
  const { createExpense } = useExpenseStore()
  const { user } = useAuthStore()
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content: '👋 你好！我是你的AI记账助手。请告诉我这次消费的情况，比如："昨天晚餐花了200元，我和张三李四一起吃的"',
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedExpense | null>(null)
  const [showMemberConfirm, setShowMemberConfirm] = useState(false)
  const [showMixedConfirm, setShowMixedConfirm] = useState(false)
  const [currentParseResult, setCurrentParseResult] = useState<ParseResult | null>(null)
  const [datePickerVisible, setDatePickerVisible] = useState(false)
  const [form] = Form.useForm()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (tripId) {
      loadData()
    }
  }, [tripId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (showConfirmDialog && parsedData) {
      handleConfirm()
    }
  }, [showConfirmDialog, parsedData])

  const loadData = async () => {
    try {
      await Promise.all([
        fetchTripDetail(tripId!),
        fetchMembers(tripId!)
      ])
    } catch (error) {
      Toast.show('加载失败')
      navigate(-1)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
  }

  const handleSend = async () => {
    if (!inputValue.trim()) return

    const userMessage = inputValue.trim()
    setInputValue('')
    
    // 添加用户消息
    addMessage({
      type: 'user',
      content: userMessage
    })

    setLoading(true)

    try {
      // 使用新的智能解析
      const result = await aiService.parseUserInput(tripId!, userMessage)
      
      if (result.confidence > 0.3) {
        setCurrentParseResult(result)
        
        // 根据意图类型处理
        switch (result.intent.intent) {
          case 'expense':
            await handleExpenseIntent(result.data)
            break
            
          case 'member':
            await handleMemberIntent(result.data)
            break
            
          case 'mixed':
            await handleMixedIntent(result.data)
            break
            
          case 'settlement':
            addMessage({
              type: 'ai',
              content: '💡 结算功能正在开发中，您可以前往"查看统计"页面查看债务关系。'
            })
            break
            
          default:
            addMessage({
              type: 'ai',
              content: '🤔 我没有完全理解您的意思。请尝试更明确的描述，比如："昨天吃饭100元，我和张三一起" 或 "添加小明小红两个成员"'
            })
        }
      } else {
        addMessage({
          type: 'ai',
          content: `🤔 我没有完全理解你的意思（置信度：${(result.confidence * 100).toFixed(0)}%）。\n\n请尝试更详细地描述，比如：\n• "昨天吃饭花了100元，我和张三一起"\n• "打车到机场50元，大家平摊"\n• "添加小明、小红两个成员"`
        })
      }
    } catch (error) {
      addMessage({
        type: 'ai',
        content: '😅 抱歉，我在处理你的消息时遇到了问题。请重试或换个方式描述。'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExpenseIntent = async (data: ParsedExpense) => {
    setParsedData(data)
    
    let responseContent = `✅ 我理解了你的${data.isIncome ? '收入' : '消费'}信息：\n\n`
    
    if (data.amount) {
      const displayAmount = Math.abs(data.amount)
      responseContent += `💰 金额：${formatCurrency(displayAmount)}${data.isIncome ? ' (收入)' : ''}\n`
    }
    
    if (data.category) {
      responseContent += `📋 类别：${data.category}\n`
    }
    
    if (data.participants && data.participants.length > 0) {
      responseContent += `👥 参与者：${data.participants.map(p => p.username).join('、')}\n`
    }
    
    responseContent += `\n🎯 置信度：${(data.confidence * 100).toFixed(0)}%\n\n点击"${data.isIncome ? '确认收入' : '确认记账'}"按钮来完善详细信息并提交。`
    
    addMessage({
      type: 'ai',
      content: responseContent,
      data
    })
    
    setTimeout(() => {
      setShowConfirmDialog(true)
    }, 500)
  }

  const handleMemberIntent = async (data: any) => {
    if (data.members && data.members.length > 0) {
      let responseContent = `✅ 我识别到您要添加以下成员：\n\n`
      
      data.members.forEach((member: any) => {
        responseContent += `👤 ${member.displayName} (置信度: ${Math.round(member.confidence * 100)}%)\n`
      })
      
      responseContent += `\n🎯 整体置信度：${(data.confidence * 100).toFixed(0)}%\n\n点击确认按钮来添加这些成员。`
      
      addMessage({
        type: 'ai',
        content: responseContent,
        data
      })
      
      setTimeout(() => {
        setShowMemberConfirm(true)
      }, 500)
    } else if (data.totalCount) {
      addMessage({
        type: 'ai',
        content: `🤔 我知道您要添加 ${data.totalCount} 个成员，但需要您提供具体的姓名。\n\n请告诉我他们的名字，比如："添加小明、小红、小李"`
      })
    } else {
      addMessage({
        type: 'ai',
        content: '🤔 我没有识别到具体的成员信息。请明确告诉我要添加谁，比如："添加张三、李四"'
      })
    }
  }

  const handleMixedIntent = async (data: any) => {
    let responseContent = `🎯 检测到复合操作！我同时识别到：\n\n`
    
    if (data.expense && data.expense.amount) {
      responseContent += `💰 支出: ${formatCurrency(Math.abs(data.expense.amount))}\n`
    }
    
    if (data.members && data.members.members.length > 0) {
      responseContent += `👥 新成员: ${data.members.members.map((m: any) => m.displayName).join('、')}\n`
    }
    
    responseContent += `\n您可以选择同时执行，或分别处理。`
    
    addMessage({
      type: 'ai',
      content: responseContent,
      data
    })
    
    setTimeout(() => {
      setShowMixedConfirm(true)
    }, 500)
  }

  const handleConfirm = async () => {
    if (!parsedData) return

    try {
      // 预填充表单
      const displayAmount = parsedData.amount ? Math.abs(parsedData.amount) : ''
      form.setFieldsValue({
        amount: displayAmount,
        description: parsedData.description || '',
        payerId: user?.id,
        expenseDate: new Date(),
        categoryId: currentTrip?.categories?.find(c => c.name === parsedData.category)?.id || ''
      })
      
      // 如果有参与者信息，设置默认选择
      // 这里可以进一步完善逻辑
      
    } catch (error) {
      console.error('表单预填充失败:', error)
    }
  }

  const handleSubmitExpense = async () => {
    try {
      await form.validateFields()
      const values = form.getFieldsValue()
      
      // 构建支出数据
      const amount = parseFloat(values.amount)
      const finalAmount = parsedData?.isIncome ? -Math.abs(amount) : Math.abs(amount)
      
      const expenseData = {
        amount: finalAmount,
        payerId: values.payerId,
        description: values.description,
        expenseDate: values.expenseDate.toISOString(),
        categoryId: values.categoryId,
        participants: members
          .filter(m => m.userId)
          .map(m => ({
            userId: m.userId!,
            shareAmount: finalAmount / members.filter(m => m.userId).length // 暂时平均分摊
          }))
      }

      await createExpense(tripId!, expenseData)
      
      Toast.show(parsedData?.isIncome ? '收入记录成功！' : '记账成功！')
      setShowConfirmDialog(false)
      
      // 添加成功消息
      const successType = parsedData?.isIncome ? '收入' : '消费'
      addMessage({
        type: 'system',
        content: `✅ ${successType}记录成功！已记录 ${formatCurrency(Math.abs(finalAmount))} 的${successType}。`
      })
      
      // 清空解析数据
      setParsedData(null)
      
    } catch (error: any) {
      Toast.show(error.message || '记账失败')
    }
  }

  const handleMemberConfirm = async (memberNames: string[]) => {
    try {
      setLoading(true)
      const result = await aiService.addMembers(tripId!, memberNames)
      
      if (result.success) {
        let message = `✅ 成功添加 ${result.added.length} 个成员！`
        
        if (result.failed.length > 0) {
          message += `\n❌ ${result.failed.length} 个添加失败`
        }
        
        if (result.validation.duplicates.length > 0) {
          message += `\n⚠️ ${result.validation.duplicates.length} 个成员已存在`
        }
        
        addMessage({
          type: 'system',
          content: message
        })
        
        // 刷新成员列表
        await fetchMembers(tripId!)
        
      } else {
        addMessage({
          type: 'ai',
          content: '❌ 添加成员失败：未知错误'
        })
      }
    } catch (error) {
      addMessage({
        type: 'ai',
        content: '❌ 添加成员时发生错误，请重试。'
      })
    } finally {
      setLoading(false)
      setShowMemberConfirm(false)
    }
  }

  const handleMixedConfirmExpense = async (expenseData: any) => {
    // 处理混合意图中的记账部分
    setParsedData({
      ...expenseData,
      confidence: currentParseResult?.data.expense.confidence || 0.5
    })
    setShowMixedConfirm(false)
    setShowConfirmDialog(true)
  }

  const handleMixedConfirmMembers = async (memberNames: string[]) => {
    // 处理混合意图中的成员添加部分
    setShowMixedConfirm(false)
    await handleMemberConfirm(memberNames)
  }

  const handleMixedConfirmBoth = async (expenseData: any, memberNames: string[]) => {
    try {
      setLoading(true)
      
      // 先添加成员
      const memberResult = await aiService.addMembers(tripId!, memberNames)
      
      // 如果成员添加成功，再处理记账
      if (memberResult.success && memberResult.added.length > 0) {
        // 刷新成员列表
        await fetchMembers(tripId!)
        
        // 设置记账数据
        setParsedData({
          ...expenseData,
          confidence: currentParseResult?.data.expense.confidence || 0.5
        })
        
        addMessage({
          type: 'system',
          content: `✅ 成功添加 ${memberResult.added.length} 个成员，现在请确认记账信息。`
        })
        
        setShowMixedConfirm(false)
        setTimeout(() => {
          setShowConfirmDialog(true)
        }, 1000)
      } else {
        addMessage({
          type: 'ai',
          content: '❌ 成员添加失败，请重试或分别处理。'
        })
      }
    } catch (error) {
      addMessage({
        type: 'ai',
        content: '❌ 处理复合操作时发生错误，请重试。'
      })
    } finally {
      setLoading(false)
      setShowMixedConfirm(false)
    }
  }

  if (!currentTrip) {
    return null
  }

  return (
    <div className="chat-expense-page">
      <NavBar onBack={() => navigate(-1)}>AI智能记账</NavBar>

      <div className="messages-container">
        {messages.map(message => (
          <div key={message.id} className={`message message-${message.type}`}>
            <div className="message-content">
              {message.content.split('\n').map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </div>
            <div className="message-time">
              {message.timestamp.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="message message-ai">
            <div className="message-content typing">
              AI正在思考中...
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        {parsedData && (
          <Button 
            color="primary" 
            size="small"
            onClick={() => setShowConfirmDialog(true)}
            style={{ marginBottom: 8 }}
          >
            {parsedData.isIncome ? '确认收入' : '确认记账'}
          </Button>
        )}
        
        <div className="input-row">
          <Input
            placeholder="描述你的消费情况..."
            value={inputValue}
            onChange={setInputValue}
            onEnterPress={handleSend}
            disabled={loading}
          />
          <Button 
            color="primary"
            onClick={handleSend}
            loading={loading}
            disabled={!inputValue.trim()}
          >
            <SendOutline />
          </Button>
        </div>
        
        <div className="input-tips">
          💡 试试说："昨天吃饭100元，我和张三一起" 或 "添加小明小红" 或 "和新来的王五一起吃饭200元"
        </div>
      </div>

      {/* 确认记账对话框 */}
      <Dialog
        visible={showConfirmDialog}
        title={parsedData?.isIncome ? "确认收入信息" : "确认记账信息"}
        content={
          <Form form={form} layout="horizontal">
            <Form.Item
              name="amount"
              label="金额"
              rules={[{ required: true, message: '请输入金额' }]}
            >
              <Input type="number" placeholder="0.00" />
            </Form.Item>

            <Form.Item
              name="payerId"
              label="付款人"
              rules={[{ required: true, message: '请选择付款人' }]}
            >
              <Selector
                columns={2}
                options={members
                  .filter(m => m.userId)
                  .map(m => ({
                    label: m.isVirtual ? (m.displayName || '虚拟成员') : (m.user?.username || 'Unknown'),
                    value: m.userId!
                  }))}
              />
            </Form.Item>

            <Form.Item name="description" label="描述">
              <Input placeholder="消费描述" />
            </Form.Item>

            <Form.Item
              name="expenseDate"
              label="日期"
              rules={[{ required: true, message: '请选择日期' }]}
              trigger="onConfirm"
              onClick={() => setDatePickerVisible(true)}
            >
              <DatePicker 
                precision="day"
                visible={datePickerVisible}
                onClose={() => setDatePickerVisible(false)}
                onConfirm={(date) => {
                  form.setFieldValue('expenseDate', date)
                  setDatePickerVisible(false)
                }}
              >
                {(value) => value ? formatDate(value) : '请选择'}
              </DatePicker>
            </Form.Item>

            <Form.Item name="categoryId" label="类别">
              <Selector
                columns={3}
                options={currentTrip.categories?.map(c => ({
                  label: `${c.icon} ${c.name}`,
                  value: c.id
                })) || []}
              />
            </Form.Item>
          </Form>
        }
        actions={[
          {
            key: 'cancel',
            text: '取消',
            onClick: () => setShowConfirmDialog(false)
          },
          {
            key: 'confirm',
            text: parsedData?.isIncome ? '提交收入' : '提交记账',
            onClick: handleSubmitExpense
          }
        ]}
      />

      {/* 成员确认对话框 */}
      {currentParseResult?.intent.intent === 'member' && (
        <MemberConfirm
          visible={showMemberConfirm}
          title="确认添加成员"
          members={currentParseResult.data.members || []}
          onClose={() => setShowMemberConfirm(false)}
          onConfirm={handleMemberConfirm}
          loading={loading}
        />
      )}

      {/* 混合意图确认对话框 */}
      {currentParseResult?.intent.intent === 'mixed' && (
        <MixedIntentConfirm
          visible={showMixedConfirm}
          data={currentParseResult.data}
          onClose={() => setShowMixedConfirm(false)}
          onConfirmExpense={handleMixedConfirmExpense}
          onConfirmMembers={handleMixedConfirmMembers}
          onConfirmBoth={handleMixedConfirmBoth}
          loading={loading}
        />
      )}
    </div>
  )
}

export default ChatExpense