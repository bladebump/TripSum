import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  NavBar,
  Form,
  Input,
  Button,
  DatePicker,
  Selector,
  ImageUploader,
  Toast,
  Checkbox,
  Radio,
  Space,
  TextArea
} from 'antd-mobile'
import { ImageUploadItem } from 'antd-mobile/es/components/image-uploader'
import { useTripStore } from '@/stores/trip.store'
import { useExpenseStore } from '@/stores/expense.store'
import { useAuthStore } from '@/stores/auth.store'
import aiService from '@/services/ai.service'
import { getCurrentMemberId } from '@/utils/member'
import { formatDate } from '@/utils/format'
import { validateAmount } from '@/utils/validation'
import './ExpenseForm.scss'

const ExpenseForm: React.FC = () => {
  const { id: tripId, expenseId } = useParams<{ id: string; expenseId?: string }>()
  const navigate = useNavigate()
  const { currentTrip, members, fetchTripDetail } = useTripStore()
  const { createExpense, updateExpense } = useExpenseStore()
  const { user } = useAuthStore()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [splitMethod, setSplitMethod] = useState<'equal' | 'custom' | 'percentage'>('equal')
  const [fileList, setFileList] = useState<ImageUploadItem[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({})

  useEffect(() => {
    if (tripId) {
      loadData()
    }
  }, [tripId])

  const loadData = async () => {
    try {
      // fetchTripDetail 现在会同时获取成员信息
      await fetchTripDetail(tripId!)
      // 默认选中所有成员
      setSelectedMembers(members.map(m => m.id))
    } catch (error) {
      Toast.show('加载失败')
      navigate(-1)
    }
  }

  const handleAIParse = async () => {
    const description = form.getFieldValue('description')
    if (!description) {
      Toast.show('请先输入描述')
      return
    }

    setAiLoading(true)
    try {
      const parseResult = await aiService.parseUserInput(tripId!, description)
      
      if (parseResult.intent.intent !== 'expense') {
        Toast.show('无法识别为支出信息')
        return
      }
      
      const result = parseResult.data
      
      if (result.amount) {
        form.setFieldValue('amount', result.amount)
      }
      
      if (result.category && currentTrip?.categories) {
        const category = currentTrip.categories.find(c => 
          c.name.toLowerCase() === result.category?.toLowerCase()
        )
        if (category) {
          form.setFieldValue('categoryId', category.id)
        }
      }
      
      if (result.participants && result.participants.length > 0) {
        const participantIds = result.participants
          .map((p: any) => {
            // 查找成员（包括虚拟成员）
            const member = members.find(m => 
              (m.isVirtual && m.displayName === p.username) || 
              (!m.isVirtual && m.user?.username === p.username)
            )
            return member?.id
          })
          .filter(Boolean) as string[]
        setSelectedMembers(participantIds)
        
        if (result.participants.some((p: any) => p.shareAmount)) {
          setSplitMethod('custom')
          const amounts: Record<string, number> = {}
          result.participants.forEach((p: any) => {
            const member = members.find(m => 
              (m.isVirtual && m.displayName === p.username) || 
              (!m.isVirtual && m.user?.username === p.username)
            )
            if (member && p.shareAmount) {
              amounts[member.id] = p.shareAmount
            }
          })
          setCustomAmounts(amounts)
        }
      }
      
      Toast.show({
        icon: 'success',
        content: `AI解析成功 (置信度: ${(result.confidence * 100).toFixed(0)}%)`
      })
    } catch (error) {
      Toast.show('AI解析失败')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      await form.validateFields()
      const values = form.getFieldsValue()
      
      const amountValidation = validateAmount(values.amount)
      if (!amountValidation.valid) {
        Toast.show(amountValidation.message!)
        return
      }

      // 构建参与者数据 - 统一使用 memberId (tripMemberId)
      const participants = selectedMembers.map(memberId => {
        if (splitMethod === 'equal') {
          return {
            memberId: memberId,
            shareAmount: values.amount / selectedMembers.length
          }
        } else if (splitMethod === 'custom') {
          return {
            memberId: memberId,
            shareAmount: customAmounts[memberId] || 0
          }
        } else {
          // percentage
          return {
            memberId: memberId,
            sharePercentage: 100 / selectedMembers.length
          }
        }
      })

      setLoading(true)
      
      const expenseData = {
        amount: parseFloat(values.amount),
        payerId: values.payerId,
        description: values.description,
        expenseDate: values.expenseDate.toISOString(),
        categoryId: values.categoryId,
        participants
      }

      const receipt = fileList[0] && 'file' in fileList[0] ? (fileList[0] as any).file as File : undefined

      if (expenseId) {
        await updateExpense(expenseId, expenseData, receipt)
        Toast.show('更新成功')
      } else {
        await createExpense(tripId!, expenseData, receipt)
        Toast.show('添加成功')
      }
      
      navigate(`/trips/${tripId}`)
    } catch (error: any) {
      Toast.show(error.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  if (!currentTrip) {
    return null
  }

  return (
    <div className="expense-form-page">
      <NavBar onBack={() => navigate(-1)}>
        {expenseId ? '编辑支出' : '添加支出'}
      </NavBar>

      <div className="form-content">
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
            initialValue={getCurrentMemberId(members, user?.id)}
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
            <div>
              <TextArea 
                placeholder="如：晚餐，大家一起吃火锅" 
                rows={2}
              />
              <Button 
                size="small" 
                color="primary"
                fill="outline"
                onClick={handleAIParse}
                loading={aiLoading}
                style={{ marginTop: 8 }}
              >
                AI智能解析
              </Button>
            </div>
          </Form.Item>

          <Form.Item
            name="expenseDate"
            label="日期"
            rules={[{ required: true, message: '请选择日期' }]}
            initialValue={new Date()}
            trigger="onConfirm"
          >
            <DatePicker>
              {(value) => value ? formatDate(value) : '请选择'}
            </DatePicker>
          </Form.Item>

          <Form.Item
            name="categoryId"
            label="类别"
            initialValue={currentTrip.categories?.find(c => c.name === '其他')?.id}
          >
            <Selector
              columns={3}
              options={currentTrip.categories?.map(c => ({
                label: `${c.icon || '📦'} ${c.name}`,
                value: c.id
              })) || []}
            />
          </Form.Item>

          <Form.Item label="分摊方式">
            <Radio.Group value={splitMethod} onChange={(val) => setSplitMethod(val as 'equal' | 'custom' | 'percentage')}>
              <Space direction="vertical">
                <Radio value="equal">平均分摊</Radio>
                <Radio value="custom">自定义金额</Radio>
                <Radio value="percentage">按百分比</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Form.Item label="参与者">
            <Checkbox.Group
              value={selectedMembers}
              onChange={(val) => setSelectedMembers(val as string[])}
            >
              <Space direction="vertical">
                {members.map(member => (
                  <Checkbox key={member.id} value={member.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{member.isVirtual ? member.displayName : member.user?.username}</span>
                      {splitMethod === 'custom' && selectedMembers.includes(member.id) && (
                        <Input
                          type="number"
                          placeholder="金额"
                          style={{ width: 100 }}
                          value={customAmounts[member.id]?.toString() || '0'}
                          onChange={(val) => {
                            setCustomAmounts({
                              ...customAmounts,
                              [member.id]: parseFloat(val) || 0
                            })
                          }}
                        />
                      )}
                    </div>
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item label="上传凭证">
            <ImageUploader
              value={fileList}
              onChange={setFileList}
              maxCount={1}
              accept="image/*"
              upload={async (file) => ({ url: URL.createObjectURL(file) })}
            />
          </Form.Item>
        </Form>

        <div className="form-footer">
          <Button 
            block 
            color="primary" 
            size="large"
            loading={loading}
            onClick={handleSubmit}
          >
            {expenseId ? '保存修改' : '添加支出'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ExpenseForm