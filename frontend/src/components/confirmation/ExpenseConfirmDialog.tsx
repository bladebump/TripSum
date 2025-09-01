import React from 'react'
import {
  Dialog,
  Form,
  Input,
  Selector,
  DatePicker,
  Checkbox,
  Space
} from 'antd-mobile'
import { TripMember, Category } from '@/types'
import { formatCurrency } from '@/utils/format'
import './ExpenseConfirmDialog.scss'

interface ExpenseConfirmDialogProps {
  visible: boolean
  form: any // 使用any避免类型冲突
  parsedData: any
  members: TripMember[]
  categories?: Category[]
  selectedMembers: string[]
  onSelectedMembersChange: (members: string[]) => void
  onConfirm: () => void
  onCancel: () => void
}

const ExpenseConfirmDialog: React.FC<ExpenseConfirmDialogProps> = ({
  visible,
  form,
  parsedData,
  members,
  categories = [],
  selectedMembers,
  onSelectedMembersChange,
  onConfirm,
  onCancel
}) => {
  return (
    <Dialog
      visible={visible}
      className="confirm-dialog expense-confirm"
      title="确认消费信息"
      content={
        <div className="confirm-dialog-content">
          <Form form={form} layout="vertical">
            {/* 金额输入 */}
            <div className="amount-section">
              <div className="section-label">
                <span className="label-icon">💰</span>
                <span>消费金额</span>
              </div>
              <div className="amount-input-wrapper">
                <span className="currency-symbol">¥</span>
                <Form.Item 
                  name="amount" 
                  initialValue={parsedData?.amount?.toString()}
                  rules={[{ required: true, message: '请输入金额' }]}
                  className="amount-input"
                >
                  <Input 
                    type="number" 
                    placeholder="0.00"
                    className="amount-value"
                  />
                </Form.Item>
              </div>
            </div>
            
            {/* 描述输入 */}
            <div className="form-section">
              <Form.Item 
                name="description" 
                label="描述" 
                initialValue={parsedData?.description}
              >
                <Input placeholder="请输入描述" />
              </Form.Item>
            </div>
            
            {/* 付款人选择 */}
            <div className="form-section">
              <Form.Item 
                name="payerMemberId" 
                label="付款人" 
                initialValue={parsedData?.payerId}
                rules={[{ required: true, message: '请选择付款人' }]}
              >
                <Selector
                  columns={2}
                  options={members.map(m => ({
                    label: m.isVirtual ? (m.displayName || '虚拟成员') : (m.user?.username || '未知用户'),
                    value: m.id
                  }))}
                />
              </Form.Item>
            </div>
            
            {/* 日期选择 */}
            <div className="form-section">
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
            </div>
            
            {/* 分类选择 */}
            {categories.length > 0 && (
              <div className="form-section">
                <Form.Item
                  name="categoryId"
                  label="分类"
                  initialValue={
                    parsedData?.category 
                      ? categories.find(c => c.name === parsedData.category)?.id
                      : categories.find(c => c.name === '其他')?.id
                  }
                >
                  <Selector
                    columns={3}
                    options={categories.map(c => ({
                      label: (
                        <div className="category-option">
                          <span className="category-icon">{c.icon || '📦'}</span>
                          <span className="category-name">{c.name}</span>
                        </div>
                      ),
                      value: c.id
                    }))}
                  />
                </Form.Item>
              </div>
            )}
            
            {/* 参与者选择 */}
            <div className="form-section">
              <Form.Item label="参与者">
                <div className="participants-selector">
                  <Checkbox.Group
                    value={selectedMembers}
                    onChange={(val) => onSelectedMembersChange(val as string[])}
                  >
                    <Space wrap>
                      {members.map(member => (
                        <Checkbox 
                          key={member.id} 
                          value={member.id}
                          className="participant-checkbox"
                        >
                          <div className="participant-info">
                            <span className="participant-avatar">
                              {member.isVirtual ? '👤' : '👤'}
                            </span>
                            <span className="participant-name">
                              {member.isVirtual ? (member.displayName || '虚拟成员') : (member.user?.username || '未知用户')}
                            </span>
                          </div>
                        </Checkbox>
                      ))}
                    </Space>
                  </Checkbox.Group>
                  {selectedMembers.length > 0 && (
                    <div className="participant-summary">
                      <span className="summary-text">
                        已选择 {selectedMembers.length} 人，人均 
                      </span>
                      <span className="summary-amount">
                        {formatCurrency((parseFloat(form.getFieldValue('amount') || '0') / selectedMembers.length) || 0)}
                      </span>
                    </div>
                  )}
                </div>
              </Form.Item>
            </div>
          </Form>
        </div>
      }
      closeOnAction
      actions={[
        {
          key: 'cancel',
          text: '取消',
          className: 'dialog-cancel-btn',
          onClick: onCancel
        },
        {
          key: 'confirm',
          text: '确认',
          className: 'dialog-confirm-btn',
          bold: true,
          onClick: onConfirm
        }
      ]}
    />
  )
}

export default ExpenseConfirmDialog