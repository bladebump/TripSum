import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  NavBar, 
  Tabs, 
  List, 
  Card,
  Button,
  FloatingBubble,
  Tag,
  Toast,
  Dialog,
  SwipeAction
} from 'antd-mobile'
import { 
  AddOutline
} from 'antd-mobile-icons'
import { useTripStore } from '@/stores/trip.store'
import { useExpenseStore } from '@/stores/expense.store'
import { useAuthStore } from '@/stores/auth.store'
import { exportService } from '@/services/export.service'
import { formatDate, formatCurrency, formatDateTime } from '@/utils/format'
import { isCurrentUserAdmin } from '@/utils/member'
import Loading from '@/components/common/Loading'
import Empty from '@/components/common/Empty'
import './TripDetail.scss'

const TripDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentTrip, members, fetchTripDetail, deleteTrip } = useTripStore()
  const { expenses, fetchExpenses, deleteExpense } = useExpenseStore()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('expenses')
  const [loading, setLoading] = useState(true)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null)
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      loadTripData()
    }
  }, [id])

  const loadTripData = async () => {
    try {
      setLoading(true)
      // 只调用必要的API，fetchTripDetail会同时获取统计数据和成员信息
      await Promise.all([
        fetchTripDetail(id!),
        fetchExpenses(id!)  // 仅在需要详细支出列表时保留
      ])
    } catch (error) {
      Toast.show('加载失败')
      navigate('/trips')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    Dialog.confirm({
      content: '确定要删除这条支出记录吗？',
      onConfirm: async () => {
        try {
          await deleteExpense(expenseId)
          Toast.show('删除成功')
        } catch (error) {
          Toast.show('删除失败')
        }
      }
    })
  }

  const handleDeleteTrip = async () => {
    Dialog.confirm({
      content: `确定要删除行程"${currentTrip?.name}"吗？\n\n删除后将无法恢复，包括所有支出记录和成员信息。`,
      onConfirm: async () => {
        try {
          setDeleteLoading(true)
          await deleteTrip(id!)
          Toast.show('行程已删除')
          navigate('/trips')
        } catch (error) {
          Toast.show('删除失败，请重试')
        } finally {
          setDeleteLoading(false)
        }
      }
    })
  }

  const handleExportToExcel = async () => {
    try {
      Toast.show({
        icon: 'loading',
        content: '正在生成Excel文件...',
        duration: 0
      })
      await exportService.exportTripToExcel(id!)
      Toast.clear()
      Toast.show('导出成功')
    } catch (error) {
      Toast.clear()
      console.error('导出失败:', error)
      Toast.show('导出失败，请重试')
    }
  }


  if (loading || !currentTrip) {
    return <Loading text="加载中..." />
  }

  if (deleteLoading) {
    return <Loading text="正在删除行程..." />
  }

  const isAdmin = isCurrentUserAdmin(members, user?.id)

  return (
    <div className="trip-detail-page">
      <NavBar onBack={() => navigate('/trips')}>
        {currentTrip.name}
      </NavBar>

      <div className="trip-info-card">
        <Card>
          <div className="summary-item">
            <span>📅 {formatDate(currentTrip.startDate)} - {currentTrip.endDate ? formatDate(currentTrip.endDate) : '进行中'}</span>
          </div>
          {currentTrip.description && (
            <div className="summary-item">
              <p>{currentTrip.description}</p>
            </div>
          )}
          <div className="summary-stats">
            <div className="stat-item">
              <div className="stat-value">
                {formatCurrency(currentTrip.statistics?.fundStatus?.totalContributions || 0)}
              </div>
              <div className="stat-label">基金池</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{formatCurrency(currentTrip.statistics?.totalExpenses || 0)}</div>
              <div className="stat-label">总支出</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{members.length}</div>
              <div className="stat-label">成员</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{currentTrip.statistics?.expenseCount || 0}</div>
              <div className="stat-label">笔数</div>
            </div>
          </div>
        </Card>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.Tab title="支出记录" key="expenses">
          <div className="tab-content">
            {expenses.length === 0 ? (
              <Empty 
                title="还没有支出记录"
                description="点击右下角按钮添加第一笔支出"
              />
            ) : (
              <List>
                {expenses.map(expense => (
                  <SwipeAction
                    key={expense.id}
                    rightActions={[
                      {
                        key: 'edit',
                        text: '编辑',
                        color: 'primary',
                        onClick: () => navigate(`/trips/${id}/expense/${expense.id}/edit`)
                      },
                      {
                        key: 'delete',
                        text: '删除',
                        color: 'danger',
                        onClick: () => handleDeleteExpense(expense.id)
                      }
                    ]}
                  >
                    <List.Item
                      prefix={
                        <div className="expense-category">
                          {expense.category?.icon || '💰'}
                        </div>
                      }
                      description={
                        <div>
                          <div>{expense.payerMember?.isVirtual ? (expense.payerMember?.displayName || '虚拟成员') : (expense.payerMember?.user?.username || '未知用户')} 付款 · {formatDateTime(expense.expenseDate)}</div>
                          {expense.description && <div className="expense-desc">{expense.description}</div>}
                          {expense.participantsSummary && (
                            <div className="expense-participants" style={{ 
                              marginTop: 4, 
                              fontSize: 12, 
                              color: '#666',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <span>👥</span>
                              {expense.participantsSummary.isEqualShare ? (
                                <span>{expense.participantsSummary.count}人参与，人均{formatCurrency(expense.participantsSummary.averageShare)}</span>
                              ) : (
                                <span>
                                  {expense.participantsSummary.names.slice(0, 3).join('、')}
                                  {expense.participantsSummary.hasMore && '等'}
                                  {expense.participantsSummary.count}人参与
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      }
                      extra={
                        <div className="expense-amount">
                          {formatCurrency(expense.amount)}
                        </div>
                      }
                      onClick={() => setExpandedExpenseId(expandedExpenseId === expense.id ? null : expense.id)}
                    />
                    {expandedExpenseId === expense.id && expense.participantsSummary?.details && (
                      <div style={{
                        padding: '12px 16px',
                        backgroundColor: '#f7f7f7',
                        borderTop: '1px solid #eee'
                      }}>
                        <div style={{ fontSize: 14, color: '#333', marginBottom: 8, fontWeight: 500 }}>
                          参与者详情：
                        </div>
                        {expense.participantsSummary.details.map((participant: any) => (
                          <div key={participant.memberId} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '4px 0'
                          }}>
                            <span style={{ fontSize: 13, color: '#666' }}>
                              {participant.isVirtual && '👤 '}
                              {participant.name}
                            </span>
                            <span style={{ fontSize: 13, color: '#ff6b6b', fontWeight: 500 }}>
                              {formatCurrency(participant.shareAmount)}
                            </span>
                          </div>
                        ))}
                        {expense.isPaidFromFund && (
                          <div style={{
                            marginTop: 8,
                            padding: '4px 8px',
                            backgroundColor: '#e6f7ff',
                            borderRadius: 4,
                            fontSize: 12,
                            color: '#1890ff'
                          }}>
                            💰 此支出从基金池支付
                          </div>
                        )}
                      </div>
                    )}
                  </SwipeAction>
                ))}
              </List>
            )}
          </div>
        </Tabs.Tab>

        <Tabs.Tab title="收款记录" key="contributions">
          <div className="tab-content">
            {members.filter(m => m.contribution && Number(m.contribution) > 0).length === 0 ? (
              <Empty 
                title="还没有收款记录"
                description="当成员缴纳基金时，会在这里显示"
              />
            ) : (
              <List>
                {members
                  .filter(m => m.contribution && Number(m.contribution) > 0)
                  .map(member => (
                    <List.Item
                      key={member.id}
                      prefix={
                        <div className="member-avatar">
                          {member.isVirtual 
                            ? (member.displayName?.[0] || '虚').toUpperCase()
                            : (member.user?.username?.[0] || 'U').toUpperCase()}
                        </div>
                      }
                      description={
                        <div>
                          <div>{member.isVirtual ? '虚拟成员' : member.user?.email}</div>
                          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                            缴纳时间: {new Date().toLocaleDateString()}
                          </div>
                        </div>
                      }
                      extra={
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#52c41a' }}>
                          {formatCurrency(member.contribution)}
                        </div>
                      }
                    >
                      {member.isVirtual ? (member.displayName || '虚拟成员') : (member.user?.username || '未知用户')}
                    </List.Item>
                  ))}
              </List>
            )}
            
            {members.filter(m => m.contribution && Number(m.contribution) > 0).length > 0 && (
              <div style={{ padding: 16, backgroundColor: '#f5f5f5', marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: '#666' }}>基金池总额</span>
                  <span style={{ fontSize: 18, fontWeight: 600, color: '#1890ff' }}>
                    {formatCurrency(currentTrip.initialFund || 0)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Tabs.Tab>

        <Tabs.Tab title="成员" key="members">
          <div className="tab-content">
            <List>
              {members.map(member => (
                <React.Fragment key={member.id}>
                <List.Item
                  prefix={
                    <div className="member-avatar">
                      {member.isVirtual 
                        ? (member.displayName?.[0] || '虚').toUpperCase()
                        : (member.user?.username?.[0] || 'U').toUpperCase()}
                    </div>
                  }
                  description={
                    <div>
                      {member.isVirtual ? '虚拟成员' : member.user?.email}
                      {member.contribution && Number(member.contribution) > 0 && (
                        <div style={{ marginTop: 4 }}>
                          基金缴纳: {formatCurrency(member.contribution)}
                        </div>
                      )}
                    </div>
                  }
                  extra={
                    <div>
                      {member.role === 'admin' && <Tag color="primary">管理员</Tag>}
                      {(() => {
                        const memberStatus = currentTrip.statistics?.membersFinancialStatus?.find(
                          (m: any) => m.memberId === member.id
                        )
                        const balance = memberStatus?.balance || 0
                        return balance !== undefined ? (
                          <div className={`member-balance ${balance > 0 ? 'positive' : balance < 0 ? 'negative' : ''}`}>
                            <div>
                              {balance > 0 ? '应收' : balance < 0 ? '应付' : '已清'}
                            </div>
                            {balance !== 0 && (
                              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>
                                {formatCurrency(Math.abs(balance))}
                              </div>
                            )}
                          </div>
                        ) : null
                      })()}
                    </div>
                  }
                  onClick={() => setExpandedMemberId(expandedMemberId === member.id ? null : member.id)}
                >
                  {member.isVirtual 
                    ? `${member.displayName || '虚拟成员'} (虚拟)` 
                    : (member.user?.username || '未知用户')}
                </List.Item>
                {expandedMemberId === member.id && (() => {
                  const memberStatus = currentTrip.statistics?.membersFinancialStatus?.find(
                    (m: any) => m.memberId === member.id
                  )
                  return memberStatus ? (
                    <div style={{
                      padding: '12px 16px',
                      backgroundColor: '#f7f7f7',
                      borderTop: '1px solid #eee',
                      borderBottom: '1px solid #eee'
                    }}>
                      <div style={{ fontSize: 14, color: '#333', marginBottom: 12, fontWeight: 500 }}>
                        财务明细：
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, color: '#666' }}>💰 基金缴纳</span>
                          <span style={{ fontSize: 13, color: '#52c41a', fontWeight: 500 }}>
                            +{formatCurrency(memberStatus.contribution)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, color: '#666' }}>💳 垫付总额</span>
                          <span style={{ fontSize: 13, color: '#1890ff', fontWeight: 500 }}>
                            +{formatCurrency(memberStatus.totalPaid)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, color: '#666' }}>📊 应该分摊</span>
                          <span style={{ fontSize: 13, color: '#ff6b6b', fontWeight: 500 }}>
                            -{formatCurrency(memberStatus.totalShare)}
                          </span>
                        </div>
                        <div style={{ 
                          borderTop: '1px solid #e0e0e0', 
                          paddingTop: 8, 
                          marginTop: 8,
                          display: 'flex',
                          justifyContent: 'space-between'
                        }}>
                          <span style={{ fontSize: 14, color: '#333', fontWeight: 500 }}>
                            余额 (缴纳+垫付-分摊)
                          </span>
                          <span style={{ 
                            fontSize: 16, 
                            color: memberStatus.balance > 0 ? '#52c41a' : memberStatus.balance < 0 ? '#ff6b6b' : '#999',
                            fontWeight: 600 
                          }}>
                            {memberStatus.balance > 0 ? '+' : ''}{formatCurrency(memberStatus.balance)}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                          参与 {memberStatus.expenseCount} 笔支出，垫付 {memberStatus.paidCount} 笔
                        </div>
                      </div>
                    </div>
                  ) : null
                })()}
              </React.Fragment>
              ))}
            </List>

            {isAdmin && (
              <div className="add-member-btn">
                <Button block color="primary" onClick={() => navigate(`/trips/${id}/members/add`)}>
                  添加成员
                </Button>
              </div>
            )}
          </div>
        </Tabs.Tab>
      </Tabs>

      {/* 重新设计的操作按钮网格 */}
      <div className="action-buttons-container">
        <div className="action-buttons-grid">
          <div className="action-button primary" onClick={() => navigate(`/trips/${id}/expense/new`)}>
            <div className="action-icon">➕</div>
            <div className="action-text">记账</div>
          </div>
          
          <div className="action-button" onClick={() => navigate(`/trips/${id}/dashboard`)}>
            <div className="action-icon">💵</div>
            <div className="action-text">账单</div>
          </div>
          
          <div className="action-button success" onClick={() => navigate(`/trips/${id}/settlement`)}>
            <div className="action-icon">💰</div>
            <div className="action-text">结算</div>
          </div>
          
          <div className="action-button export" onClick={handleExportToExcel}>
            <div className="action-icon">📊</div>
            <div className="action-text">导出</div>
          </div>
          
          {isAdmin && (
            <>
              <div className="action-button admin-only" onClick={() => navigate(`/trips/${id}/members/add`)}>
                <div className="action-icon">👥</div>
                <div className="action-text">成员</div>
              </div>
              
              <div className="action-button" onClick={() => navigate(`/trips/${id}/summary`)}>
                <div className="action-icon">🤖</div>
                <div className="action-text">复盘</div>
              </div>
              
              <div className="action-button" onClick={() => navigate(`/trips/${id}/edit`)}>
                <div className="action-icon">✏️</div>
                <div className="action-text">编辑</div>
              </div>
              
              <div className="action-button danger" onClick={handleDeleteTrip}>
                <div className="action-icon">🗑️</div>
                <div className="action-text">删除</div>
              </div>
            </>
          )}
          
          {!isAdmin && (
            <>
              <div className="action-button" onClick={() => navigate(`/trips/${id}/summary`)}>
                <div className="action-icon">🤖</div>
                <div className="action-text">复盘</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 简化的浮动按钮，仅用于快速添加支出 */}
      <FloatingBubble
        style={{
          '--initial-position-bottom': '80px',
          '--initial-position-right': '24px',
        }}
        onClick={() => navigate(`/trips/${id}/expense/new`)}
      >
        <AddOutline fontSize={28} />
      </FloatingBubble>
    </div>
  )
}

export default TripDetail