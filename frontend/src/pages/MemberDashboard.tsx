import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NavBar, Card, List, ProgressBar, Tag } from 'antd-mobile'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { useExpenseStore } from '@/stores/expense.store'
import { useTripStore } from '@/stores/trip.store'
import tripService from '@/services/trip.service'
import { formatCurrency } from '@/utils/format'
import Loading from '@/components/common/Loading'
import './MemberDashboard.scss'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

const MemberDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { balances, fetchBalances } = useExpenseStore()
  const { members } = useTripStore()
  const [statistics, setStatistics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  const loadData = async () => {
    try {
      setLoading(true)
      await fetchBalances(id!)
      const stats = await tripService.getTripStatistics(id!)
      setStatistics(stats)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Loading text="加载中..." />
  }

  const pieData = statistics?.categoryBreakdown?.map((item: any) => ({
    name: item.categoryName,
    value: item.amount
  })) || []

  const barData = balances.map(balance => ({
    name: balance.username,
    contribution: balance.contribution || 0, // 基金缴纳
    paid: balance.totalPaid, // 实际垫付
    share: balance.totalShare, // 应该分摊
    balance: balance.balance // 最终余额
  }))

  return (
    <div className="member-dashboard-page">
      <NavBar onBack={() => navigate(`/trips/${id}`)}>
        成员看板
      </NavBar>

      <div className="dashboard-content">
        <Card title="总览" className="summary-card">
          <div className="summary-grid">
            <div className="summary-item">
              <div className="value">{formatCurrency(statistics?.totalExpenses || 0)}</div>
              <div className="label">总支出</div>
            </div>
            <div className="summary-item">
              <div className="value">{statistics?.expenseCount || 0}</div>
              <div className="label">支出笔数</div>
            </div>
            <div className="summary-item">
              <div className="value">{members.length}</div>
              <div className="label">成员数</div>
            </div>
            <div className="summary-item">
              <div className="value">{formatCurrency(statistics?.averagePerPerson || 0)}</div>
              <div className="label">人均消费</div>
            </div>
          </div>
        </Card>

        <Card title="成员余额" className="balance-card">
          <List>
            {balances.map(balance => (
              <List.Item
                key={balance.memberId || balance.userId}  // 优先使用memberId
                description={
                  <div className="balance-detail">
                    <div className="balance-row">
                      <span>基金: {formatCurrency(balance.contribution || 0)}</span>
                      <span>垫付: {formatCurrency(balance.totalPaid)}</span>
                    </div>
                    <div className="balance-row">
                      <span>应分摊: {formatCurrency(balance.totalShare)}</span>
                      <span className={balance.balance > 0 ? 'positive' : balance.balance < 0 ? 'negative' : ''}>
                        余额: {balance.balance > 0 ? '+' : ''}{formatCurrency(balance.balance)}
                      </span>
                    </div>
                    <ProgressBar
                      percent={(balance.totalPaid / (statistics?.totalExpenses || 1)) * 100}
                      style={{ '--track-width': '4px', marginTop: 8 }}
                    />
                  </div>
                }
                extra={
                  <Tag 
                    color={balance.balance > 0 ? 'success' : balance.balance < 0 ? 'danger' : 'default'}
                  >
                    {balance.balance > 0 ? '+' : ''}{formatCurrency(balance.balance)}
                  </Tag>
                }
              >
                {balance.username}
              </List.Item>
            ))}
          </List>
        </Card>

        {pieData.length > 0 && (
          <Card title="支出分类" className="chart-card">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}

        <Card title="资金流向" className="chart-card">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="contribution" fill="#82CA9D" name="基金缴纳" />
              <Bar dataKey="paid" fill="#0088FE" name="实际垫付" />
              <Bar dataKey="share" fill="#00C49F" name="应该分摊" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="结算建议" className="debt-card">
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f0f5ff', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: '#666' }}>
              💡 以下是建议的结算方案，最小化转账次数
            </div>
          </div>
          {balances.filter(b => b.owesTo.length > 0).length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div>当前没有需要结算的债务</div>
            </div>
          ) : (
            <List>
              {balances.map(balance => (
                balance.owesTo.length > 0 && (
                  <List.Item 
                    key={`owes-${balance.memberId || balance.userId}`}  // 优先使用memberId
                    arrow={false}
                  >
                    <div className="debt-item" style={{ width: '100%' }}>
                      {balance.owesTo.map(debt => (
                        <div 
                          key={debt.memberId} 
                          className="debt-detail"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            backgroundColor: '#fafafa',
                            borderRadius: 8,
                            marginBottom: 8
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 600 }}>{balance.username}</span>
                            <span style={{ color: '#999' }}>→</span>
                            <span style={{ fontWeight: 600 }}>{debt.username}</span>
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 600, color: '#ff4d4f' }}>
                            {formatCurrency(debt.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </List.Item>
                )
              ))}
            </List>
          )}
          {balances.filter(b => b.owesTo.length > 0).length > 0 && (
            <div style={{ marginTop: 16, padding: 12, backgroundColor: '#fff7e6', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#666' }}>
                ⚠️ 请按照上述建议进行转账，完成后点击"结算"按钮清零债务
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default MemberDashboard