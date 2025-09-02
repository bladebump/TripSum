import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  NavBar, 
  Card, 
  Tabs, 
  List,
  Grid,
  ProgressBar,
  Tag,
  Toast
} from 'antd-mobile'
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, 
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'
import { useTripStore } from '@/stores/trip.store'
import { formatCurrency } from '@/utils/format'
import Loading from '@/components/common/Loading'
import './TripStatistics.scss'

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2']

const TripStatistics: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentTrip, fetchTripDetail } = useTripStore()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (id) {
      loadStatistics()
    }
  }, [id])

  const loadStatistics = async () => {
    try {
      setLoading(true)
      await fetchTripDetail(id!)
    } catch (error) {
      Toast.show('加载统计数据失败')
      navigate(`/trips/${id}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !currentTrip?.statistics) {
    return <Loading text="加载统计数据..." />
  }

  const { statistics } = currentTrip
  const { 
    advancedMetrics, 
    timeDistribution, 
    paymentMethodStats, 
    categoryBreakdown,
    dailyExpenses,
    membersFinancialStatus
  } = statistics

  // 准备图表数据
  const categoryData = categoryBreakdown && categoryBreakdown.length > 0 
    ? categoryBreakdown.map(cat => ({
        name: cat.categoryName || '未分类',
        value: cat.amount,
        percentage: cat.percentage
      }))
    : []

  const timeData = timeDistribution ? [
    { name: '早上', value: timeDistribution.morning.amount, count: timeDistribution.morning.count },
    { name: '下午', value: timeDistribution.afternoon.amount, count: timeDistribution.afternoon.count },
    { name: '晚上', value: timeDistribution.evening.amount, count: timeDistribution.evening.count },
    { name: '深夜', value: timeDistribution.night.amount, count: timeDistribution.night.count }
  ] : []

  const paymentData = paymentMethodStats ? [
    { name: '基金池支付', value: paymentMethodStats.fundPool.amount, count: paymentMethodStats.fundPool.count },
    { name: '成员垫付', value: paymentMethodStats.memberReimbursement.amount, count: paymentMethodStats.memberReimbursement.count }
  ] : []

  const trendData = dailyExpenses?.map(day => ({
    date: day.date.split('-').slice(1).join('/'),
    amount: day.amount,
    count: day.count
  })) || []

  return (
    <div className="trip-statistics">
      <NavBar onBack={() => navigate(`/trips/${id}`)}>
        统计分析
      </NavBar>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.Tab title="总览" key="overview">
          <div className="tab-content">
            {/* 核心指标卡片 */}
            <Grid columns={2} gap={12}>
              <Grid.Item>
                <Card className="metric-card">
                  <div className="metric-label">总支出</div>
                  <div className="metric-value">{formatCurrency(statistics.totalExpenses)}</div>
                </Card>
              </Grid.Item>
              <Grid.Item>
                <Card className="metric-card">
                  <div className="metric-label">人均消费</div>
                  <div className="metric-value">{formatCurrency(advancedMetrics?.averagePerPerson || 0)}</div>
                </Card>
              </Grid.Item>
              <Grid.Item>
                <Card className="metric-card">
                  <div className="metric-label">日均消费</div>
                  <div className="metric-value">{formatCurrency(advancedMetrics?.dailyAverage || 0)}</div>
                </Card>
              </Grid.Item>
              <Grid.Item>
                <Card className="metric-card">
                  <div className="metric-label">消费笔数</div>
                  <div className="metric-value">{statistics.expenseCount}</div>
                </Card>
              </Grid.Item>
            </Grid>

            {/* 高级指标 */}
            {advancedMetrics && (
              <Card title="高级指标" style={{ marginTop: 12 }}>
                <List>
                  <List.Item extra={formatCurrency(advancedMetrics.averagePerExpense)}>
                    单笔平均
                  </List.Item>
                  <List.Item extra={formatCurrency(advancedMetrics.maxExpense)}>
                    最高单笔
                  </List.Item>
                  <List.Item extra={formatCurrency(advancedMetrics.minExpense)}>
                    最低单笔
                  </List.Item>
                  <List.Item extra={`${advancedMetrics.tripDuration}天`}>
                    行程天数
                  </List.Item>
                  <List.Item extra={`${advancedMetrics.activeConsumers}人`}>
                    活跃消费者
                  </List.Item>
                  <List.Item 
                    extra={
                      <Tag color={
                        advancedMetrics.trend === 'increasing' ? 'danger' : 
                        advancedMetrics.trend === 'decreasing' ? 'success' : 
                        'default'
                      }>
                        {advancedMetrics.trend === 'increasing' ? '上升' : 
                         advancedMetrics.trend === 'decreasing' ? '下降' : 
                         '平稳'}
                      </Tag>
                    }
                  >
                    消费趋势
                  </List.Item>
                  {advancedMetrics.peakDay && (
                    <List.Item 
                      description={`${advancedMetrics.peakDay.count}笔消费`}
                      extra={formatCurrency(advancedMetrics.peakDay.amount)}
                    >
                      消费峰值日 ({advancedMetrics.peakDay.date})
                    </List.Item>
                  )}
                </List>
              </Card>
            )}
          </div>
        </Tabs.Tab>

        <Tabs.Tab title="分类分析" key="category">
          <div className="tab-content">
            {categoryData.length > 0 ? (
              <>
                <Card title="分类支出占比">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>

                <Card title="分类明细" style={{ marginTop: 12 }}>
                  <List>
                    {categoryData.map((cat, index) => (
                      <List.Item
                        key={index}
                        prefix={
                          <div 
                            style={{ 
                              width: 12, 
                              height: 12, 
                              borderRadius: '50%',
                              backgroundColor: COLORS[index % COLORS.length]
                            }} 
                          />
                        }
                        extra={formatCurrency(cat.value)}
                      >
                        <div>{cat.name}</div>
                        <ProgressBar 
                          percent={cat.percentage} 
                          style={{ marginTop: 8 }}
                        />
                      </List.Item>
                    ))}
                  </List>
                </Card>
              </>
            ) : (
              <Card>
                <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
                  <div>暂无分类数据</div>
                  <div style={{ fontSize: 12, marginTop: 8 }}>支出记录会自动分类统计</div>
                </div>
              </Card>
            )}
          </div>
        </Tabs.Tab>

        <Tabs.Tab title="时间分析" key="time">
          <div className="tab-content">
            {/* 时间段分布 */}
            {timeData.length > 0 && (
              <Card title="时间段消费分布">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={timeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="value" fill="#1890ff" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* 每日趋势 */}
            {trendData.length > 0 && (
              <Card title="每日消费趋势" style={{ marginTop: 12 }}>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Area type="monotone" dataKey="amount" stroke="#52c41a" fill="#52c41a" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>
        </Tabs.Tab>

        <Tabs.Tab title="支付方式" key="payment">
          <div className="tab-content">
            {paymentMethodStats && (
              <>
                <Card title="支付方式分布">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={paymentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {paymentData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#1890ff' : '#52c41a'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>

                <Card style={{ marginTop: 12 }}>
                  <List>
                    <List.Item
                      extra={
                        <div>
                          <div>{formatCurrency(paymentMethodStats.fundPool.amount)}</div>
                          <div style={{ fontSize: 12, color: '#999' }}>
                            {paymentMethodStats.fundPool.count}笔
                          </div>
                        </div>
                      }
                    >
                      基金池支付
                      <ProgressBar 
                        percent={paymentMethodStats.fundPool.percentage} 
                        style={{ marginTop: 8 }}
                      />
                    </List.Item>
                    <List.Item
                      extra={
                        <div>
                          <div>{formatCurrency(paymentMethodStats.memberReimbursement.amount)}</div>
                          <div style={{ fontSize: 12, color: '#999' }}>
                            {paymentMethodStats.memberReimbursement.count}笔
                          </div>
                        </div>
                      }
                    >
                      成员垫付
                      <ProgressBar 
                        percent={paymentMethodStats.memberReimbursement.percentage} 
                        style={{ marginTop: 8 }}
                      />
                    </List.Item>
                  </List>
                </Card>
              </>
            )}
          </div>
        </Tabs.Tab>

        <Tabs.Tab title="成员分析" key="members">
          <div className="tab-content">
            {advancedMetrics?.memberAverages && (
              <Card title="成员消费统计">
                <List>
                  {advancedMetrics.memberAverages.map(member => (
                    <List.Item
                      key={member.memberId}
                      description={
                        <div>
                          <div>日均消费: {formatCurrency(member.dailyAverage)}</div>
                          <div>单笔平均: {formatCurrency(member.averageExpense)}</div>
                        </div>
                      }
                    >
                      {member.username}
                    </List.Item>
                  ))}
                </List>
              </Card>
            )}

            {membersFinancialStatus && (
              <Card title="成员财务状态" style={{ marginTop: 12 }}>
                <List>
                  {membersFinancialStatus.map(member => (
                    <List.Item
                      key={member.memberId}
                      description={
                        <div>
                          <div>缴纳: {formatCurrency(member.contribution)}</div>
                          <div>垫付: {formatCurrency(member.totalPaid)}</div>
                          <div>分摊: {formatCurrency(member.totalShare)}</div>
                        </div>
                      }
                      extra={
                        <div className={`balance ${member.balance > 0 ? 'positive' : member.balance < 0 ? 'negative' : ''}`}>
                          {member.balance > 0 ? '+' : ''}{formatCurrency(member.balance)}
                        </div>
                      }
                    >
                      {member.username}
                      {member.role === 'admin' && <Tag color="primary" style={{ marginLeft: 8 }}>管理员</Tag>}
                    </List.Item>
                  ))}
                </List>
              </Card>
            )}
          </div>
        </Tabs.Tab>

      </Tabs>
    </div>
  )
}

export default TripStatistics