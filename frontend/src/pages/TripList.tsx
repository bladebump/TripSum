import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  NavBar, 
  List, 
  Card, 
  Button, 
  Tag, 
  FloatingBubble,
  Dialog,
  Form,
  Input,
  DatePicker,
  Toast,
  PullToRefresh,
  InfiniteScroll
} from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useTripStore } from '@/stores/trip.store'
import { formatDate, formatCurrency, getTripStatus, getTripStatusText, getTripStatusColor } from '@/utils/format'
import Empty from '@/components/common/Empty'
import Loading from '@/components/common/Loading'
import './TripList.scss'

const TripList: React.FC = () => {
  const navigate = useNavigate()
  const { trips, loading, pagination, fetchTrips, createTrip } = useTripStore()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [startDateVisible, setStartDateVisible] = useState(false)
  const [endDateVisible, setEndDateVisible] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    loadTrips()
  }, [])

  const loadTrips = async (page = 1) => {
    try {
      await fetchTrips({ page, limit: 10 })
      setHasMore(page < pagination.totalPages)
    } catch (error) {
      Toast.show('加载失败')
    }
  }

  const loadMore = async () => {
    const nextPage = pagination.page + 1
    await loadTrips(nextPage)
  }

  const handleCreateTrip = async () => {
    try {
      await form.validateFields()
      const values = form.getFieldsValue()
      
      setCreateLoading(true)
      const trip = await createTrip({
        name: values.name,
        description: values.description,
        startDate: values.startDate.toISOString(),
        endDate: values.endDate?.toISOString(),
        initialFund: values.initialFund || 0,
        currency: 'CNY'
      })
      
      Toast.show({
        icon: 'success',
        content: '创建成功'
      })
      setShowCreateDialog(false)
      form.resetFields()
      navigate(`/trips/${trip.id}`)
    } catch (error: any) {
      Toast.show({
        icon: 'fail',
        content: error.message || '创建失败'
      })
    } finally {
      setCreateLoading(false)
    }
  }

  if (loading && trips.length === 0) {
    return <Loading text="加载中..." />
  }

  return (
    <div className="trip-list-page">
      <NavBar backArrow={false}>我的行程</NavBar>

      <PullToRefresh onRefresh={() => loadTrips(1)}>
        <div className="trip-list-content">
          {trips.length === 0 ? (
            <Empty 
              title="还没有行程" 
              description="创建你的第一个旅行账本吧"
            >
              <Button 
                color="primary" 
                onClick={() => setShowCreateDialog(true)}
              >
                创建行程
              </Button>
            </Empty>
          ) : (
            <List>
              {trips.map(trip => {
                const status = getTripStatus(trip.startDate, trip.endDate)
                return (
                  <List.Item key={trip.id} onClick={() => navigate(`/trips/${trip.id}`)}>
                    <Card className="trip-card">
                      <div className="trip-header">
                        <h3>{trip.name}</h3>
                        <Tag color={getTripStatusColor(status)}>
                          {getTripStatusText(status)}
                        </Tag>
                      </div>
                      {trip.description && (
                        <p className="trip-description">{trip.description}</p>
                      )}
                      <div className="trip-info">
                        <span>📅 {formatDate(trip.startDate)}</span>
                        <span>👥 {trip.memberCount || 0}人</span>
                        <span>💰 {formatCurrency(trip.totalExpenses || 0)}</span>
                      </div>
                      {trip.myBalance !== undefined && trip.myBalance !== 0 && (
                        <div className={`trip-balance ${trip.myBalance > 0 ? 'positive' : 'negative'}`}>
                          我的余额: {formatCurrency(Math.abs(trip.myBalance))}
                          {trip.myBalance > 0 ? ' (应收)' : ' (应付)'}
                        </div>
                      )}
                    </Card>
                  </List.Item>
                )
              })}
            </List>
          )}

          <InfiniteScroll 
            loadMore={loadMore} 
            hasMore={hasMore && trips.length > 0}
          />
        </div>
      </PullToRefresh>

      <FloatingBubble
        style={{
          '--initial-position-bottom': '80px',
          '--initial-position-right': '24px',
        }}
        onClick={() => setShowCreateDialog(true)}
      >
        <AddOutline fontSize={28} />
      </FloatingBubble>

      <Dialog
        visible={showCreateDialog}
        title="创建行程"
        content={
          <Form form={form} layout="horizontal">
            <Form.Item
              name="name"
              label="行程名称"
              rules={[{ required: true, message: '请输入行程名称' }]}
            >
              <Input placeholder="如：云南七日游" />
            </Form.Item>
            <Form.Item name="description" label="描述">
              <Input placeholder="可选，简单描述这次行程" />
            </Form.Item>
            <Form.Item
              name="startDate"
              label="开始日期"
              rules={[{ required: true, message: '请选择开始日期' }]}
              trigger="onConfirm"
              onClick={() => setStartDateVisible(true)}
            >
              <DatePicker 
                precision="day"
                visible={startDateVisible}
                onClose={() => setStartDateVisible(false)}
                onConfirm={(date) => {
                  form.setFieldValue('startDate', date)
                  setStartDateVisible(false)
                }}
              >
                {(value) => value ? formatDate(value) : '请选择'}
              </DatePicker>
            </Form.Item>
            <Form.Item
              name="endDate"
              label="结束日期"
              trigger="onConfirm"
              onClick={() => setEndDateVisible(true)}
            >
              <DatePicker 
                precision="day"
                visible={endDateVisible}
                onClose={() => setEndDateVisible(false)}
                onConfirm={(date) => {
                  form.setFieldValue('endDate', date)
                  setEndDateVisible(false)
                }}
              >
                {(value) => value ? formatDate(value) : '请选择'}
              </DatePicker>
            </Form.Item>
            <Form.Item name="initialFund" label="初始基金">
              <Input type="number" placeholder="可选，如共同基金金额" />
            </Form.Item>
          </Form>
        }
        closeOnAction
        actions={[
          {
            key: 'cancel',
            text: '取消',
            onClick: () => {
              form.resetFields()
              setShowCreateDialog(false)
              setStartDateVisible(false)
              setEndDateVisible(false)
            }
          },
          {
            key: 'confirm',
            text: '创建',
            color: 'primary',
            disabled: createLoading,
            onClick: handleCreateTrip
          }
        ]}
      />
    </div>
  )
}

export default TripList