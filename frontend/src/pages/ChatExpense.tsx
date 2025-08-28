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
  DatePicker,
  Checkbox,
  Space
} from 'antd-mobile'
import { SendOutline } from 'antd-mobile-icons'
import { useTripStore } from '@/stores/trip.store'
import { useExpenseStore } from '@/stores/expense.store'
import { useAuthStore } from '@/stores/auth.store'
import aiService from '@/services/ai.service'
import { formatDate, formatCurrency } from '@/utils/format'
import { MemberConfirm, MixedIntentConfirm, IncomeConfirm } from '@/components/confirmation'
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
  isIncome?: boolean
  payerId?: string
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
  const { trips, currentTrip, members, fetchTrips, fetchTripDetail, fetchMembers } = useTripStore()
  const { createExpense } = useExpenseStore()
  const { user } = useAuthStore()
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content: `👋 你好，${user?.username || '用户'}！我是你的AI记账助手。\n\n请告诉我这次消费的情况，比如：\n• "昨天晚餐花了200元，我和张三李四一起吃的"\n• "我代付了打车费100元"\n• "添加小明小红两个成员"`,
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
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [form] = Form.useForm()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (tripId) {
      loadData()
    }
  }, [tripId])

  useEffect(() => {
    // 加载用户的所有行程列表
    fetchTrips()
  }, [])

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

  const handleTripChange = (selectedTripIds: string[]) => {
    const newTripId = selectedTripIds[0]
    if (newTripId && newTripId !== tripId) {
      // 如果有对话记录，询问是否保留
      if (messages.length > 1) { // 排除初始系统消息
        Dialog.confirm({
          title: '切换行程',
          content: '切换到新行程后，当前对话记录将被清空。是否继续？',
          confirmText: '确认切换',
          cancelText: '取消',
          onConfirm: () => {
            navigate(`/trips/${newTripId}/expense/new`)
          }
        })
      } else {
        // 没有对话记录，直接切换
        navigate(`/trips/${newTripId}/expense/new`)
      }
    }
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
      // 使用新的智能解析，传递成员信息
      const result = await aiService.parseUserInput(tripId!, userMessage, members)
      
      if (result.confidence > 0.3) {
        setCurrentParseResult(result)
        
        // 根据意图类型处理
        switch (result.intent.intent) {
          case 'expense':
            // 检查是否为基金缴纳
            if ((result.data as any).isFundContribution) {
              await handleFundContribution(result.data)
            } else {
              await handleExpenseIntent(result.data)
            }
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

  const handleFundContribution = async (data: any) => {
    setParsedData(data)
    
    // 设置参与者 - 确保所有缴纳成员都被选中
    if (data.participants && data.participants.length > 0) {
      const memberIds = data.participants.map((p: any) => {
        const member = members.find(m => 
          (m.isVirtual && m.displayName === p.username) || 
          (!m.isVirtual && m.user?.username === p.username)
        )
        return member?.id
      }).filter(Boolean) as string[]
      setSelectedMembers(memberIds)
    } else {
      // 如果没有明确参与者，默认选择所有成员
      setSelectedMembers(members.map(m => m.id))
    }
    
    // 生成基金缴纳响应
    let responseContent = `✅ 我理解了你的基金缴纳信息：\n\n`
    
    if (data.amount) {
      responseContent += `💰 总金额：${formatCurrency(data.amount)}\n`
    }
    
    if (data.participants && data.participants.length > 0) {
      responseContent += `👥 缴纳详情：\n`
      data.participants.forEach((p: any) => {
        responseContent += `   • ${p.username}：${formatCurrency(Math.abs(p.shareAmount || 0))}\n`
      })
    }
    
    responseContent += `\n🎯 置信度：${(data.confidence * 100).toFixed(0)}%\n\n`
    responseContent += `点击"确认基金缴纳"按钮来提交。`
    
    addMessage({
      type: 'ai',
      content: responseContent,
      data
    })
    
    setTimeout(() => {
      setShowConfirmDialog(true)
    }, 500)
  }

  const handleExpenseIntent = async (data: ParsedExpense) => {
    setParsedData(data)
    
    // 检查是否为基金缴纳
    const isFundContribution = (data as any).isFundContribution === true
    
    // 设置参与者
    if (data.participants && data.participants.length > 0) {
      // 根据用户名找到对应的member.id
      const memberIds = data.participants.map(p => {
        const member = members.find(m => 
          (m.isVirtual && m.displayName === p.username) || 
          (!m.isVirtual && m.user?.username === p.username)
        )
        return member?.id
      }).filter(Boolean) as string[]
      setSelectedMembers(memberIds)
    } else if (data.excludedMembers) {
      // 如果有排除成员，选择剩余的成员
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
      // 默认选择所有成员
      setSelectedMembers(members.map(m => m.id))
    }
    
    let responseContent = ''
    
    if (isFundContribution) {
      responseContent = `✅ 我理解了你的基金缴纳信息：\n\n`
    } else {
      responseContent = `✅ 我理解了你的${data.isIncome ? '收入' : '消费'}信息：\n\n`
    }
    
    if (data.amount) {
      const displayAmount = Math.abs(data.amount)
      if (isFundContribution) {
        responseContent += `💰 缴纳金额：${formatCurrency(displayAmount)}\n`
      } else {
        responseContent += `💰 金额：${formatCurrency(displayAmount)}${data.isIncome ? ' (收入)' : ''}\n`
      }
    }
    
    if (!isFundContribution && data.payerId) {
      const payer = members.find(m => (m.userId || m.id) === data.payerId)
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
      if (isFundContribution) {
        responseContent += `👥 缴纳人员：${data.participants.map(p => `${p.username}(${formatCurrency(p.shareAmount || 0)})`).join('、')}\n`
      } else {
        responseContent += `👥 参与者：${data.participants.map(p => p.username).join('、')}\n`
      }
    }
    
    let buttonText = '确认记账'
    if (isFundContribution) {
      buttonText = '确认基金缴纳'
    } else if (data.isIncome) {
      buttonText = '确认收入'
    }
    
    responseContent += `\n🎯 置信度：${(data.confidence * 100).toFixed(0)}%\n\n点击"${buttonText}"按钮来完善详细信息并提交。`
    
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
        payerId: parsedData.payerId || members.find(m => m.userId === user?.id)?.id, // 使用TripMember.id
        expenseDate: new Date(),
        categoryId: currentTrip?.categories?.find(c => c.name === parsedData.category)?.id || ''
      })
      
      // 如果有参与者信息，设置默认选择
      // 这里可以进一步完善逻辑
      
    } catch (error) {
      console.error('表单预填充失败:', error)
    }
  }

  const handleFundContributionSubmit = async (data: any) => {
    try {
      const contributions = data.participants.map((participant: any) => {
        // 找到对应的成员
        const member = members.find(m => {
          return (m.isVirtual && m.displayName === participant.username) || 
                 (!m.isVirtual && m.user?.username === participant.username)
        })
        
        if (!member) {
          console.warn(`未找到成员: ${participant.username}`)
          return null
        }
        
        return {
          memberId: member.id, // 使用TripMember的id
          contribution: Math.abs(participant.shareAmount || 0) // 确保是正数
        }
      }).filter((c: any) => c !== null)
      
      if (contributions.length === 0) {
        Toast.show('未找到有效的缴纳成员')
        return
      }
      
      // 使用恢复的基金缴纳API
      const { default: contributionService } = await import('@/services/contribution.service')
      await contributionService.batchUpdateContributions(tripId!, contributions)
      
      Toast.show({
        icon: 'success',
        content: `✅ 基金缴纳记录成功！共 ${contributions.length} 人缴纳`
      })
      
      // 刷新行程数据
      await fetchTripDetail(tripId!)
      await fetchMembers(tripId!)
      setShowConfirmDialog(false)
      
      // 添加成功消息
      addMessage({
        type: 'system',
        content: `✅ 基金缴纳记录成功！共收到 ${formatCurrency(incomeData.totalAmount)} 的基金。`
      })
      
      setParsedData(null)
      
      // 刷新行程数据
      fetchTripDetail(tripId!)
    } catch (error: any) {
      Toast.show(error.message || '记录失败')
    }
  }

  const handleSubmitExpense = async () => {
    try {
      await form.validateFields()
      const values = form.getFieldsValue()
      
      // 构建支出数据
      const amount = parseFloat(values.amount)
      const finalAmount = parsedData?.isIncome ? -Math.abs(amount) : Math.abs(amount)
      
      // 构建参与者数据 - 只包含选中的成员
      const participantList = selectedMembers.map(memberId => {
        // 找到对应的成员信息
        const member = members.find(m => m.id === memberId)
        return {
          userId: member?.userId || undefined,
          memberId: memberId,
          shareAmount: Math.abs(finalAmount) / selectedMembers.length // 平均分摊
        }
      })

      // 确保至少有一个参与者
      if (participantList.length === 0) {
        Toast.show('请至少选择一个参与者')
        return
      }

      const expenseData = {
        amount: finalAmount,
        payerId: parsedData?.payerId || values.payerId, // 优先使用AI识别的付款人
        description: values.description,
        expenseDate: values.expenseDate.toISOString(),
        categoryId: values.categoryId,
        participants: participantList
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

      {/* 用户身份标注 */}
      <div style={{ 
        padding: '8px 16px', 
        backgroundColor: '#f0f5ff', 
        borderBottom: '1px solid #e8e8e8',
        fontSize: 12,
        color: '#666'
      }}>
        👤 当前用户: <strong>{user?.username}</strong>
        <span style={{ marginLeft: 12, color: '#999' }}>
          提示: 当您说"我"时，AI会识别为{user?.username}
        </span>
      </div>

      {/* 行程选择器 */}
      {trips.length > 1 ? (
        <div className="trip-selector-container">
          <div className="trip-selector-label">当前记账行程:</div>
          <Selector
            options={trips.map(trip => ({
              label: `${trip.name} (${formatCurrency(trip.initialFund || 0)})`,
              value: trip.id!
            }))}
            value={tripId ? [tripId] : []}
            onChange={handleTripChange}
            columns={1}
          />
        </div>
      ) : (
        <div className="trip-selector-container">
          <div className="trip-info">
            <span className="trip-name">{currentTrip?.name}</span>
            <span className="trip-fund">基金: {formatCurrency(currentTrip?.initialFund || 0)}</span>
          </div>
        </div>
      )}

      <div className="messages-container">
        {messages.map(message => (
          <div key={message.id} className={`message message-${message.type}`}>
            {message.type === 'user' && (
              <div style={{ 
                fontSize: 11, 
                color: '#999', 
                marginBottom: 4,
                fontWeight: 600
              }}>
                {user?.username} (我):
              </div>
            )}
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

      {/* 确认对话框 - 根据类型显示不同组件 */}
      {(parsedData as any)?.isFundContribution ? (
        <IncomeConfirm
          visible={showConfirmDialog}
          data={parsedData}
          members={members}
          tripId={tripId!}
          onConfirm={handleFundContributionSubmit}
          onCancel={() => setShowConfirmDialog(false)}
        />
      ) : parsedData?.isIncome ? (
        <IncomeConfirm
          visible={showConfirmDialog}
          data={parsedData}
          members={members}
          tripId={tripId!}
          onConfirm={() => {/* 普通收入暂不处理 */}}
          onCancel={() => setShowConfirmDialog(false)}
        />
      ) : (
        <Dialog
          visible={showConfirmDialog}
          title="确认支出信息"
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
                  .map(m => ({
                    label: m.isVirtual ? (m.displayName || '虚拟成员') : (m.user?.username || 'Unknown'),
                    value: m.id  // 使用TripMember.id
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

            <Form.Item label="参与者">
              <Checkbox.Group
                value={selectedMembers}
                onChange={(val) => setSelectedMembers(val as string[])}
              >
                <Space wrap>
                  {members.map(member => {
                    return (
                      <Checkbox key={member.id} value={member.id}>
                        {member.isVirtual ? member.displayName : member.user?.username}
                      </Checkbox>
                    )
                  })}
                </Space>
              </Checkbox.Group>
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
      )}

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