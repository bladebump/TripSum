import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NavBar, Card, List, ProgressBar, Tag } from 'antd-mobile'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { useExpenseStore } from '@/stores/expense.store'
import { useTripStore } from '@/stores/trip.store'
import tripService from '@/services/trip.service'
import { formatCurrency, formatPercentage } from '@/utils/format'
import Loading from '@/components/common/Loading'
import './MemberDashboard.scss'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

const MemberDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { balances, fetchBalances } = useExpenseStore()
  const { currentTrip, members } = useTripStore()
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
    paid: balance.totalPaid,
    share: balance.totalShare,
    balance: balance.balance
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
                key={balance.userId}
                description={
                  <div className="balance-detail">
                    <div className="balance-row">
                      <span>已付: {formatCurrency(balance.totalPaid)}</span>
                      <span>应付: {formatCurrency(balance.totalShare)}</span>
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
                  {pieData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}

        <Card title="支付对比" className="chart-card">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="paid" fill="#0088FE" name="已付" />
              <Bar dataKey="share" fill="#00C49F" name="应付" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="债务关系" className="debt-card">
          <List>
            {balances.map(balance => (
              balance.owesTo.length > 0 && (
                <List.Item key={`owes-${balance.userId}`}>
                  <div className="debt-item">
                    <strong>{balance.username}</strong> 应付给:
                    {balance.owesTo.map(debt => (
                      <div key={debt.userId} className="debt-detail">
                        {debt.username}: {formatCurrency(debt.amount)}
                      </div>
                    ))}
                  </div>
                </List.Item>
              )
            ))}
          </List>
        </Card>
      </div>
    </div>
  )
}

export default MemberDashboard