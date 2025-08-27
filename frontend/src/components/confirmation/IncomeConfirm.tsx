import React, { useState, useEffect } from 'react'
import {
  Dialog,
  Form,
  Input,
  Radio,
  Checkbox,
  Space,
  DatePicker
} from 'antd-mobile'
import { TripMember } from '@/types'
import { formatCurrency } from '@/utils/format'

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
  tripId,
  onConfirm,
  onCancel
}) => {
  const [form] = Form.useForm()
  const [incomeMode, setIncomeMode] = useState<'uniform' | 'individual'>('uniform')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [individualAmounts, setIndividualAmounts] = useState<{ [key: string]: number }>({})
  const [uniformAmount, setUniformAmount] = useState<number>(0)

  useEffect(() => {
    if (visible && data) {
      // 根据解析数据预填充
      if (data.perPersonAmount) {
        setIncomeMode('uniform')
        setUniformAmount(Math.abs(data.perPersonAmount))
        // 默认选中所有成员
        setSelectedMembers(members.map(m => m.userId || m.id))
      } else if (data.participants && data.participants.some((p: any) => p.individualAmount)) {
        setIncomeMode('individual')
        // 设置个性化金额
        const amounts: { [key: string]: number } = {}
        data.participants.forEach((p: any) => {
          if (p.userId && p.individualAmount) {
            amounts[p.userId] = Math.abs(p.individualAmount)
            setSelectedMembers(prev => [...prev, p.userId])
          }
        })
        setIndividualAmounts(amounts)
      } else if (data.amount) {
        // 如果只有总金额，默认平均分摊
        setIncomeMode('uniform')
        const memberCount = data.participants?.length || members.length
        setUniformAmount(Math.abs(data.amount) / memberCount)
        setSelectedMembers(
          data.participants?.map((p: any) => p.userId) || members.map(m => m.userId || m.id)
        )
      } else {
        // 默认选中所有成员
        setSelectedMembers(members.map(m => m.userId || m.id))
      }

      form.setFieldsValue({
        description: data.description || '基金收入',
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
    try {
      await form.validateFields()
      const values = form.getFieldsValue()
      
      const contributors = selectedMembers.map(memberId => {
        const member = members.find(m => (m.userId || m.id) === memberId)
        return {
          userId: memberId,
          username: member?.isVirtual ? member.displayName : member?.user?.username,
          amount: incomeMode === 'uniform' ? uniformAmount : (individualAmounts[memberId] || 0)
        }
      })

      const incomeData = {
        totalAmount: getTotalAmount(), // 基金缴纳用正数
        contributors,
        description: values.description || '基金缴纳',
        date: values.date,
        isFundContribution: true // 标记为基金缴纳而非普通收入
      }

      onConfirm(incomeData)
    } catch (error) {
      console.error('表单验证失败:', error)
    }
  }

  return (
    <Dialog
      visible={visible}
      title="确认基金缴纳"
      content={
        <Form form={form} layout="horizontal">
          <Form.Item label="缴纳方式">
            <Radio.Group 
              value={incomeMode} 
              onChange={(val) => setIncomeMode(val as 'uniform' | 'individual')}
            >
              <Space direction="vertical">
                <Radio value="uniform">每人相同金额</Radio>
                <Radio value="individual">各自不同金额</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Form.Item label="缴纳成员">
            <Checkbox.Group
              value={selectedMembers}
              onChange={(val) => setSelectedMembers(val as string[])}
            >
              <Space direction="vertical">
                {members.map(member => {
                  const memberId = member.userId || member.id
                  return (
                    <div key={memberId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Checkbox value={memberId}>
                        {member.isVirtual ? member.displayName : member.user?.username}
                      </Checkbox>
                      {incomeMode === 'individual' && selectedMembers.includes(memberId) && (
                        <Input
                          type="number"
                          placeholder="金额"
                          style={{ width: 100 }}
                          value={individualAmounts[memberId]?.toString() || ''}
                          onChange={(val) => {
                            setIndividualAmounts({
                              ...individualAmounts,
                              [memberId]: parseFloat(val) || 0
                            })
                          }}
                        />
                      )}
                    </div>
                  )
                })}
              </Space>
            </Checkbox.Group>
          </Form.Item>

          {incomeMode === 'uniform' && (
            <Form.Item 
              label="每人金额"
              rules={[{ required: true, message: '请输入金额' }]}
            >
              <Input
                type="number"
                placeholder="0.00"
                value={uniformAmount.toString()}
                onChange={(val) => setUniformAmount(parseFloat(val) || 0)}
              />
            </Form.Item>
          )}

          <Form.Item name="description" label="描述">
            <Input placeholder="收入描述" />
          </Form.Item>

          <Form.Item name="date" label="日期">
            <DatePicker />
          </Form.Item>

          <Form.Item label="总计">
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#52c41a' }}>
              {formatCurrency(getTotalAmount())}
            </div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
              {selectedMembers.length} 人缴纳
            </div>
          </Form.Item>
        </Form>
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