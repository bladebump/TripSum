import React, { useState, useEffect } from 'react'
import {
  Dialog,
  Form,
  Input,
  Checkbox,
  Space,
  DatePicker
} from 'antd-mobile'
import { TripMember } from '@/types'
import { formatCurrency } from '@/utils/format'
import './ConfirmDialog.scss'

interface IncomeConfirmProps {
  visible: boolean
  data: any // 解析的数据
  members: TripMember[]
  tripId: string
  onConfirm: (incomeData: any) => void
  onCancel: () => void
}

const IncomeConfirm: React.FC<IncomeConfirmProps> = ({
  visible,
  data,
  members,
  onConfirm,
  onCancel
}) => {
  const [form] = Form.useForm()
  const [incomeMode, setIncomeMode] = useState<'uniform' | 'individual'>('uniform')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [individualAmounts, setIndividualAmounts] = useState<{ [key: string]: number }>({})
  const [uniformAmount, setUniformAmount] = useState<number>(0)

  useEffect(() => {
    console.log('=== useEffect执行 ===')
    console.log('visible:', visible, 'data:', data)
    console.log('members:', members, typeof members, Array.isArray(members))
    
    if (visible && data && members && members.length > 0) {
      // 根据解析数据预填充
      if (data.perPersonAmount) {
        // 统一每人金额模式
        setIncomeMode('uniform')
        setUniformAmount(Math.abs(data.perPersonAmount))
        console.log('设置统一模式selectedMembers')
        setSelectedMembers(members.map(m => m.id))
      } else if (data.participants && data.participants.length > 0) {
        // 有参与者的个性化缴纳模式
        setIncomeMode('individual')
        
        const amounts: { [key: string]: number } = {}
        const selectedIds: string[] = []
        
        data.participants.forEach((p: any) => {
          // 根据用户名找到对应的成员ID
          const member = members.find(m => {
            if (p.username === '当前用户') {
              // 特殊处理"当前用户"，需要找到当前登录用户对应的成员
              return m.userId // 假设当前用户有userId
            }
            return (m.isVirtual && m.displayName === p.username) || 
                   (!m.isVirtual && m.user?.username === p.username) ||
                   (m.displayName === p.username)
          })
          
          if (member && p.shareAmount) {
            amounts[member.id] = Math.abs(p.shareAmount)
            selectedIds.push(member.id)
          }
        })
        
        setIndividualAmounts(amounts)
        setSelectedMembers(selectedIds)
      } else if (data.amount) {
        // 如果只有总金额，默认平均分摊
        setIncomeMode('uniform')
        setUniformAmount(Math.abs(data.amount) / members.length)
        console.log('设置平均分摊selectedMembers')
        setSelectedMembers(members.map(m => m.id))
      } else {
        // 默认选中所有成员
        console.log('设置默认selectedMembers')
        setSelectedMembers(members.map(m => m.id))
      }

      form.setFieldsValue({
        description: data.description || '基金缴纳',
        date: new Date()
      })
    }
  }, [visible, data, members, form])

  const getTotalAmount = () => {
    if (incomeMode === 'uniform') {
      return uniformAmount * selectedMembers.length
    } else {
      return Object.values(individualAmounts).reduce((sum, amount) => sum + amount, 0)
    }
  }

  const handleConfirm = async () => {
    console.log('=== handleConfirm开始执行 ===')
    console.log('selectedMembers:', selectedMembers, typeof selectedMembers, Array.isArray(selectedMembers))
    console.log('members:', members, typeof members, Array.isArray(members))
    console.log('incomeMode:', incomeMode)
    console.log('uniformAmount:', uniformAmount)
    console.log('individualAmounts:', individualAmounts)
    
    try {
      console.log('开始form验证')
      await form.validateFields()
      console.log('form验证通过')
      
      const values = form.getFieldsValue()
      console.log('form values:', values)
      
      console.log('准备执行map操作')
      if (!selectedMembers) {
        console.error('selectedMembers是undefined!')
        return
      }
      if (!Array.isArray(selectedMembers)) {
        console.error('selectedMembers不是数组!', typeof selectedMembers)
        return
      }
      
      const contributors = selectedMembers.map(memberId => {
        console.log('处理成员ID:', memberId)
        const member = members.find(m => m.id === memberId)
        console.log('找到的成员:', member)
        return {
          userId: memberId,
          username: member?.isVirtual ? (member.displayName || '虚拟成员') : (member?.user?.username || '未知用户'),
          amount: incomeMode === 'uniform' ? uniformAmount : (individualAmounts[memberId] || 0)
        }
      })
      
      console.log('contributors生成完成:', contributors)

      const incomeData = {
        totalAmount: getTotalAmount(), // 基金缴纳用正数
        contributors,
        description: values.description || '基金缴纳',
        date: values.date,
        isFundContribution: true // 标记为基金缴纳而非普通收入
      }

      console.log('准备调用onConfirm:', incomeData)
      onConfirm(incomeData)
      console.log('onConfirm调用完成')
    } catch (error) {
      console.error('handleConfirm执行出错:', error)
      console.error('错误堆栈:', (error as Error).stack)
    }
  }

  return (
    <Dialog
      visible={visible}
      title={
        <div style={{
          background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
          padding: '20px',
          margin: '-16px -16px 0',
          color: 'white',
          fontSize: '18px',
          fontWeight: 600,
          textAlign: 'center',
          borderRadius: '12px 12px 0 0'
        }}>
          💰 确认基金缴纳
        </div>
      }
      content={
        <div className="confirm-dialog-content" style={{ padding: '20px 0' }}>
        <Form form={form} layout="horizontal">
          <div className="mode-selector" style={{ marginBottom: '20px' }}>
            <div 
              className={`mode-option ${incomeMode === 'uniform' ? 'active' : ''}`}
              onClick={() => setIncomeMode('uniform')}
              style={{
                flex: 1,
                padding: '16px',
                background: incomeMode === 'uniform' ? 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)' : 'white',
                border: `2px solid ${incomeMode === 'uniform' ? '#1677ff' : '#e8e8e8'}`,
                borderRadius: '12px',
                textAlign: 'center',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>💵</div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: incomeMode === 'uniform' ? '#1677ff' : '#333' }}>
                统一金额
              </div>
              <div style={{ fontSize: '12px', color: '#999' }}>每人缴纳相同金额</div>
            </div>
            <div 
              className={`mode-option ${incomeMode === 'individual' ? 'active' : ''}`}
              onClick={() => setIncomeMode('individual')}
              style={{
                flex: 1,
                padding: '16px',
                background: incomeMode === 'individual' ? 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)' : 'white',
                border: `2px solid ${incomeMode === 'individual' ? '#1677ff' : '#e8e8e8'}`,
                borderRadius: '12px',
                textAlign: 'center',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>💸</div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: incomeMode === 'individual' ? '#1677ff' : '#333' }}>
                个性化金额
              </div>
              <div style={{ fontSize: '12px', color: '#999' }}>各自缴纳不同金额</div>
            </div>
          </div>

          <Form.Item label="缴纳成员">
            <Checkbox.Group
              value={selectedMembers}
              onChange={(val) => setSelectedMembers(val as string[])}
            >
              <Space direction="vertical">
                {members.map(member => {
                  const memberId = member.id  // 统一使用member.id
                  const memberName = member.isVirtual ? (member.displayName || '虚拟成员') : (member.user?.username || '未知用户')
                  const amount = individualAmounts[memberId] || 0
                  
                  return (
                    <div 
                      key={memberId} 
                      className="confirm-dialog-member-card"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        background: selectedMembers.includes(memberId) ? 'linear-gradient(135deg, #f6ffed 0%, #e4f4d8 100%)' : 'white',
                        border: `1px solid ${selectedMembers.includes(memberId) ? '#52c41a' : '#f0f0f0'}`,
                        borderRadius: '12px',
                        marginBottom: '12px',
                        transition: 'all 0.3s'
                      }}
                    >
                      <Checkbox value={memberId} style={{ marginRight: '12px' }} />
                      <div className="member-avatar" style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: '16px',
                        marginRight: '12px'
                      }}>
                        {memberName?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '16px', fontWeight: 500, color: '#333' }}>{memberName}</div>
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          {member.role === 'admin' ? '管理员' : '成员'}
                        </div>
                      </div>
                      {incomeMode === 'individual' && selectedMembers.includes(memberId) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: '16px', color: '#ff6b6b' }}>¥</span>
                          <Input
                            type="number"
                            placeholder="0.00"
                            style={{ 
                              width: 100, 
                              fontSize: '18px',
                              fontWeight: 600,
                              color: '#ff6b6b',
                              textAlign: 'right',
                              border: 'none',
                              background: 'transparent'
                            }}
                            value={amount > 0 ? amount.toString() : ''}
                            onChange={(val) => {
                              setIndividualAmounts({
                                ...individualAmounts,
                                [memberId]: parseFloat(val) || 0
                              })
                            }}
                          />
                        </div>
                      )}
                      {incomeMode === 'uniform' && selectedMembers.includes(memberId) && (
                        <span style={{ fontSize: '20px', color: '#52c41a', fontWeight: 600 }}>
                          {formatCurrency(uniformAmount)}
                        </span>
                      )}
                    </div>
                  )
                })}
              </Space>
            </Checkbox.Group>
          </Form.Item>

          {incomeMode === 'uniform' && (
            <div style={{ 
              marginBottom: '20px',
              padding: '16px',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                💵 每人缴纳金额
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
                  value={uniformAmount.toString()}
                  onChange={(val) => setUniformAmount(parseFloat(val) || 0)}
                />
              </div>
            </div>
          )}

          <Form.Item name="description" label="描述">
            <Input placeholder="收入描述" />
          </Form.Item>

          <Form.Item name="date" label="日期" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker>
              {value => value ? value.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) : '请选择日期'}
            </DatePicker>
          </Form.Item>

          <div style={{
            marginTop: '24px',
            padding: '20px',
            background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
            borderRadius: '16px',
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
              💰 缴纳总金额
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              {formatCurrency(getTotalAmount())}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9, display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <span>👥 {selectedMembers.length} 人参与</span>
              {incomeMode === 'uniform' && <span>💵 每人 {formatCurrency(uniformAmount)}</span>}
            </div>
          </div>
        </Form>
        </div>
      }
      actions={[
        {
          key: 'cancel',
          text: '取消',
          onClick: onCancel
        },
        {
          key: 'confirm',
          text: '确认缴纳',
          onClick: handleConfirm
        }
      ]}
    />
  )
}

export default IncomeConfirm