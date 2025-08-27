import React, { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  NavBar,
  Input,
  Button,
  Toast,
  List,
  Dialog,
  Form,
  Selector,
  Radio,
  Space,
  Checkbox,
  DatePicker
} from 'antd-mobile'
import { SendOutline, SoundOutline } from 'antd-mobile-icons'
import { useTripStore } from '@/stores/trip.store'
import { useExpenseStore } from '@/stores/expense.store'
import { useAuthStore } from '@/stores/auth.store'
import aiService from '@/services/ai.service'
import { formatDate, formatCurrency } from '@/utils/format'
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
      // AI解析
      const result = await aiService.parseExpense(tripId!, userMessage)
      
      if (result.confidence > 0.3) {
        // 解析成功
        setParsedData(result)
        
        let responseContent = `✅ 我理解了你的${result.isIncome ? '收入' : '消费'}信息：\n\n`
        
        if (result.amount) {
          const displayAmount = Math.abs(result.amount)
          responseContent += `💰 金额：${formatCurrency(displayAmount)}${result.isIncome ? ' (收入)' : ''}\n`
        }
        
        if (result.category) {
          responseContent += `📋 类别：${result.category}\n`
        }
        
        if (result.participants && result.participants.length > 0) {
          responseContent += `👥 参与者：${result.participants.map(p => p.username).join('、')}\n`
        }
        
        responseContent += `\n🎯 置信度：${(result.confidence * 100).toFixed(0)}%\n\n点击"${result.isIncome ? '确认收入' : '确认记账'}"按钮来完善详细信息并提交。`
        
        addMessage({
          type: 'ai',
          content: responseContent,
          data: result
        })
        
        // 显示确认对话框
        setTimeout(() => {
          setShowConfirmDialog(true)
        }, 500)
        
      } else {
        // 解析失败或置信度低
        addMessage({
          type: 'ai',
          content: `🤔 我没有完全理解你的意思（置信度：${(result.confidence * 100).toFixed(0)}%）。\n\n请尝试更详细地描述，比如：\n• "昨天吃饭花了100元，我和张三一起"\n• "打车到机场50元，大家平摊"\n• "住宿费800元，4个人住"`
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
          💡 试试说："昨天吃饭100元，我和张三一起" 或 "打车50元大家平摊"
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
              <Input type="number" placeholder="0.00" prefix="¥" />
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
            color: 'primary',
            onClick: handleSubmitExpense
          }
        ]}
      />
    </div>
  )
}

export default ChatExpense