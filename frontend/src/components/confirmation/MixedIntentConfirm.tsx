import React, { useState } from 'react'
import { Tabs, Divider } from 'antd-mobile'
import BaseConfirm from './BaseConfirm'
import MemberConfirm from './MemberConfirm'

interface ExpenseData {
  amount?: number
  description?: string
  category?: string
  confidence: number
  isIncome?: boolean
}

interface MemberData {
  displayName: string
  confidence: number
}

interface MixedData {
  expense: ExpenseData
  members: {
    members: MemberData[]
    confidence: number
  }
}

interface MixedIntentConfirmProps {
  visible: boolean
  data: MixedData
  onClose: () => void
  onConfirmExpense: (expenseData: any) => void
  onConfirmMembers: (memberNames: string[]) => void
  onConfirmBoth: (expenseData: any, memberNames: string[]) => void
  loading?: boolean
}

const MixedIntentConfirm: React.FC<MixedIntentConfirmProps> = ({
  visible,
  data,
  onClose,
  onConfirmExpense,
  onConfirmMembers, 
  onConfirmBoth,
  loading = false
}) => {
  const [activeTab, setActiveTab] = useState('both')
  const [tempMembers, setTempMembers] = useState<string[]>([])

  const handleConfirmBoth = () => {
    const expenseData = {
      amount: data.expense.amount,
      description: data.expense.description,
      category: data.expense.category,
      isIncome: data.expense.isIncome
    }
    onConfirmBoth(expenseData, tempMembers)
  }

  const handleConfirmExpenseOnly = () => {
    const expenseData = {
      amount: data.expense.amount,
      description: data.expense.description, 
      category: data.expense.category,
      isIncome: data.expense.isIncome
    }
    onConfirmExpense(expenseData)
  }

  const handleConfirmMembersOnly = () => {
    onConfirmMembers(tempMembers)
  }

  const getActions = () => {
    switch (activeTab) {
      case 'both':
        return [{
          key: 'confirm',
          text: '同时执行',
          color: 'primary' as const,
          loading,
          onClick: handleConfirmBoth
        }]
      case 'expense':
        return [{
          key: 'confirm', 
          text: '仅记账',
          color: 'primary' as const,
          loading,
          onClick: handleConfirmExpenseOnly
        }]
      case 'members':
        return [{
          key: 'confirm',
          text: '仅添加成员', 
          color: 'primary' as const,
          loading,
          onClick: handleConfirmMembersOnly
        }]
      default:
        return []
    }
  }

  const renderBothContent = () => (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          🎯 检测到复合操作
        </div>
        <div style={{ fontSize: 14, color: '#666' }}>
          AI识别到您要同时添加成员和记录支出，请确认以下信息：
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
          💰 支出信息
        </div>
        <div style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8 }}>
          {data.expense.amount && (
            <div>金额: ¥{data.expense.amount.toFixed(2)}</div>
          )}
          {data.expense.description && (
            <div>描述: {data.expense.description}</div>
          )}
          {data.expense.category && (
            <div>类别: {data.expense.category}</div>
          )}
          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
            置信度: {Math.round(data.expense.confidence * 100)}%
          </div>
        </div>
      </div>

      <Divider />

      <div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
          👥 新成员信息
        </div>
        <MemberConfirm
          visible={false} // 作为内容组件使用
          title=""
          members={data.members.members}
          onClose={() => {}}
          onConfirm={setTempMembers}
          loading={false}
          allowEdit={true}
        />
      </div>
    </div>
  )

  const renderExpenseContent = () => (
    <div>
      <div style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>
        仅处理支出记录，忽略成员信息：
      </div>
      <div style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8 }}>
        {data.expense.amount && (
          <div>金额: ¥{data.expense.amount.toFixed(2)}</div>
        )}
        {data.expense.description && (
          <div>描述: {data.expense.description}</div>
        )}
        {data.expense.category && (
          <div>类别: {data.expense.category}</div>
        )}
      </div>
    </div>
  )

  const renderMembersContent = () => (
    <div>
      <div style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>
        仅添加成员，忽略支出信息：
      </div>
      <MemberConfirm
        visible={false}
        title=""
        members={data.members.members}
        onClose={() => {}}
        onConfirm={setTempMembers}
        loading={false}
        allowEdit={true}
      />
    </div>
  )

  const renderContent = () => (
    <Tabs activeKey={activeTab} onChange={setActiveTab}>
      <Tabs.Tab title="同时执行" key="both">
        {renderBothContent()}
      </Tabs.Tab>
      <Tabs.Tab title="仅记账" key="expense">
        {renderExpenseContent()}
      </Tabs.Tab>
      <Tabs.Tab title="仅加成员" key="members">
        {renderMembersContent()}
      </Tabs.Tab>
    </Tabs>
  )

  return (
    <BaseConfirm
      visible={visible}
      title="智能识别结果"
      onClose={onClose}
      actions={getActions()}
    >
      {renderContent()}
    </BaseConfirm>
  )
}

export default MixedIntentConfirm