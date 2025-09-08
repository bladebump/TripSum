import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavBar, Tabs, PullToRefresh, InfiniteScroll, Toast, Dialog, Empty } from 'antd-mobile'
import InvitationCard from '@/components/invitation/InvitationCard'
import invitationService from '@/services/invitation.service'
import { 
  InvitationWithRelations, 
  InvitationStatus,
  InvitationListQuery 
} from '@/types/invitation.types'
import Loading from '@/components/common/Loading'
import styles from './InvitationList.module.css'

const InvitationList: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')
  const [invitations, setInvitations] = useState<InvitationWithRelations[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const limit = 10

  // 初始加载
  useEffect(() => {
    loadInvitations(true)
  }, [activeTab])

  // 加载邀请列表
  const loadInvitations = async (isRefresh = false) => {
    if (!isRefresh && !hasMore) return

    const currentPage = isRefresh ? 1 : page
    const query: InvitationListQuery = {
      page: currentPage,
      limit
    }

    // 根据Tab设置状态筛选
    if (activeTab === 'pending') {
      query.status = InvitationStatus.PENDING
    }

    setLoading(currentPage === 1 && !refreshing)
    
    try {
      const result = await invitationService.getMyInvitations(query)
      
      if (isRefresh) {
        setInvitations(result.invitations)
        setPage(1)
      } else {
        setInvitations(prev => [...prev, ...result.invitations])
      }
      
      setTotal(result.total)
      setHasMore(currentPage < result.totalPages)
      
      if (!isRefresh) {
        setPage(currentPage + 1)
      }
    } catch (error) {
      console.error('加载邀请列表失败:', error)
      Toast.show({
        content: '加载失败，请重试',
        icon: 'fail'
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // 下拉刷新
  const handleRefresh = async () => {
    setRefreshing(true)
    await loadInvitations(true)
  }

  // 接受邀请
  const handleAccept = async (invitationId: string) => {
    const result = await Dialog.confirm({
      content: '确定接受此邀请吗？',
      confirmText: '接受',
      cancelText: '取消'
    })

    if (!result) return

    setActionLoading(invitationId)
    try {
      const acceptResult = await invitationService.acceptInvitation(invitationId)
      
      Toast.show({
        content: acceptResult.message || '已接受邀请',
        icon: 'success'
      })
      
      // 刷新列表
      await loadInvitations(true)
      
      // 如果是替换模式，提示用户
      if (acceptResult.isReplacement) {
        setTimeout(() => {
          Toast.show({
            content: '您已成功替换虚拟成员',
            duration: 3000
          })
        }, 1000)
      }
    } catch (error: any) {
      console.error('接受邀请失败:', error)
      Toast.show({
        content: error.message || '接受邀请失败',
        icon: 'fail'
      })
    } finally {
      setActionLoading(null)
    }
  }

  // 拒绝邀请
  const handleReject = async (invitationId: string) => {
    const result = await Dialog.confirm({
      content: '确定拒绝此邀请吗？',
      confirmText: '拒绝',
      cancelText: '取消'
    })

    if (!result) return

    setActionLoading(invitationId)
    try {
      await invitationService.rejectInvitation(invitationId)
      
      Toast.show({
        content: '已拒绝邀请',
        icon: 'success'
      })
      
      // 刷新列表
      await loadInvitations(true)
    } catch (error: any) {
      console.error('拒绝邀请失败:', error)
      Toast.show({
        content: error.message || '拒绝邀请失败',
        icon: 'fail'
      })
    } finally {
      setActionLoading(null)
    }
  }

  // 切换Tab
  const handleTabChange = (key: string) => {
    setActiveTab(key as 'pending' | 'history')
    setInvitations([])
    setPage(1)
    setHasMore(true)
  }

  // 渲染邀请列表
  const renderInvitations = () => {
    if (loading && invitations.length === 0) {
      return <Loading />
    }

    if (invitations.length === 0) {
      return (
        <Empty
          description={activeTab === 'pending' ? '暂无待处理的邀请' : '暂无邀请记录'}
          style={{ padding: '120px 0' }}
        />
      )
    }

    return (
      <>
        {invitations.map(invitation => (
          <InvitationCard
            key={invitation.id}
            invitation={invitation}
            onAccept={activeTab === 'pending' ? handleAccept : undefined}
            onReject={activeTab === 'pending' ? handleReject : undefined}
            loading={actionLoading === invitation.id}
          />
        ))}
        
        <InfiniteScroll
          loadMore={() => loadInvitations(false)}
          hasMore={hasMore}
        >
          {hasMore ? '加载中...' : '没有更多了'}
        </InfiniteScroll>
      </>
    )
  }

  return (
    <div className={styles.container}>
      <NavBar onBack={() => navigate(-1)}>我的邀请</NavBar>
      
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        className={styles.tabs}
      >
        <Tabs.Tab title='待处理' key='pending'>
          <PullToRefresh onRefresh={handleRefresh}>
            <div className={styles.content}>
              {renderInvitations()}
            </div>
          </PullToRefresh>
        </Tabs.Tab>
        
        <Tabs.Tab title='历史记录' key='history'>
          <PullToRefresh onRefresh={handleRefresh}>
            <div className={styles.content}>
              {renderInvitations()}
            </div>
          </PullToRefresh>
        </Tabs.Tab>
      </Tabs>
    </div>
  )
}

export default InvitationList