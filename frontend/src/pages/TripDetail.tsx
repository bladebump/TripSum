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
import { formatDate, formatCurrency, formatDateTime } from '@/utils/format'
import Loading from '@/components/common/Loading'
import Empty from '@/components/common/Empty'
import './TripDetail.scss'

const TripDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentTrip, members, fetchTripDetail, fetchMembers, deleteTrip } = useTripStore()
  const { expenses, fetchExpenses, deleteExpense } = useExpenseStore()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('expenses')
  const [loading, setLoading] = useState(true)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    if (id) {
      loadTripData()
    }
  }, [id])

  const loadTripData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchTripDetail(id!),
        fetchExpenses(id!),
        fetchMembers(id!)
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


  if (loading || !currentTrip) {
    return <Loading text="加载中..." />
  }

  if (deleteLoading) {
    return <Loading text="正在删除行程..." />
  }

  const isAdmin = members.find(m => m.userId === user?.id)?.role === 'admin'

  return (
    <div className="trip-detail-page">
      <NavBar onBack={() => navigate('/trips')}>
        {currentTrip.name}
      </NavBar>

      <div className="trip-summary">
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
              <div className="stat-value">{formatCurrency(currentTrip.statistics?.totalExpenses || 0)}</div>
              <div className="stat-label">总支出</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{currentTrip.statistics?.expenseCount || 0}</div>
              <div className="stat-label">笔数</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{members.length}</div>
              <div className="stat-label">成员</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{formatCurrency(currentTrip.statistics?.averagePerPerson || 0)}</div>
              <div className="stat-label">人均</div>
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
                          <div>{expense.payer?.username} 付款 · {formatDateTime(expense.expenseDate)}</div>
                          {expense.description && <div className="expense-desc">{expense.description}</div>}
                        </div>
                      }
                      extra={
                        <div className="expense-amount">
                          {formatCurrency(expense.amount)}
                        </div>
                      }
                    />
                  </SwipeAction>
                ))}
              </List>
            )}
          </div>
        </Tabs.Tab>

        <Tabs.Tab title="成员" key="members">
          <div className="tab-content">
            <List>
              {members.map(member => (
                <List.Item
                  key={member.id}
                  prefix={
                    <div className="member-avatar">
                      {member.isVirtual 
                        ? (member.displayName?.[0] || '虚').toUpperCase()
                        : (member.user?.username?.[0] || 'U').toUpperCase()}
                    </div>
                  }
                  description={member.isVirtual ? '虚拟成员' : member.user?.email}
                  extra={
                    <div>
                      {member.role === 'admin' && <Tag color="primary">管理员</Tag>}
                      {member.balance !== undefined && (
                        <div className={`member-balance ${member.balance > 0 ? 'positive' : member.balance < 0 ? 'negative' : ''}`}>
                          {formatCurrency(Math.abs(member.balance))}
                        </div>
                      )}
                    </div>
                  }
                >
                  {member.isVirtual ? member.displayName : member.user?.username}
                </List.Item>
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

      {/* 操作按钮网格 */}
      <div className="action-buttons-grid">
        <div className="action-button" onClick={() => navigate(`/trips/${id}/expense/new`)}>
          <div className="action-icon">📝</div>
          <div className="action-text">添加支出</div>
        </div>
        
        <div className="action-button" onClick={() => navigate(`/trips/${id}/dashboard`)}>
          <div className="action-icon">📊</div>
          <div className="action-text">查看统计</div>
        </div>
        
        <div className="action-button" onClick={() => navigate(`/trips/${id}/settlement`)}>
          <div className="action-icon">💰</div>
          <div className="action-text">结算</div>
        </div>

        {isAdmin && (
          <>
            <div className="action-button" onClick={() => navigate(`/trips/${id}/members/add`)}>
              <div className="action-icon">👥</div>
              <div className="action-text">添加成员</div>
            </div>
            
            <div className="action-button danger" onClick={handleDeleteTrip}>
              <div className="action-icon">🗑️</div>
              <div className="action-text">删除行程</div>
            </div>
          </>
        )}
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