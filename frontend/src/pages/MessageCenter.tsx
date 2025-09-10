import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  NavBar,
  Tabs,
  PullToRefresh,
  InfiniteScroll,
  Checkbox,
  Button,
  Space,
  Toast,
  Dialog,
  Empty
} from 'antd-mobile'
import { useMessageStore } from '@/stores/message.store'
import { MessageType, MessageStatus, MessageListQuery } from '@/types'
import MessageCard from '@/components/message/MessageCard'
import Loading from '@/components/common/Loading'
import './MessageCenter.scss'

const MessageCenter: React.FC = () => {
  const navigate = useNavigate()
  const {
    messages,
    messageLoading,
    messagePagination,
    fetchMessages,
    markAsRead,
    batchMarkAsRead,
    batchDeleteMessages
  } = useMessageStore()

  const [activeTab, setActiveTab] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectMode, setSelectMode] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  
  // 防重复调用
  const loadingRef = useRef(false)

  // 使用 useCallback 优化 loadMessages 函数，移除会导致函数重创建的依赖
  const loadMessages = useCallback(async (page: number = 1, tab?: string) => {
    // 防止重复调用
    if (loadingRef.current) {
      console.log('MessageCenter: 防止重复调用 loadMessages')
      return
    }
    
    loadingRef.current = true
    const currentTab = tab || activeTab
    console.log(`MessageCenter: 开始加载消息 - activeTab: ${currentTab}, page: ${page}`)
    
    try {
      const query: MessageListQuery = {
        page,
        limit: 20
      }

      // 根据tab设置筛选条件
      switch (currentTab) {
        case 'unread':
          query.status = MessageStatus.UNREAD
          break
        case 'invitation':
          query.type = MessageType.TRIP_INVITATION
          break
        case 'system':
          query.type = MessageType.SYSTEM_ANNOUNCEMENT
          break
      }

      await fetchMessages(query)
      
      // 更新hasMore状态 - 直接获取最新的分页信息
      const currentPagination = messagePagination
      if (page >= currentPagination.totalPages) {
        setHasMore(false)
      }
      
      console.log(`MessageCenter: 消息加载完成`)
    } catch (error) {
      console.error('MessageCenter: 加载消息失败:', error)
      Toast.show('加载消息失败')
    } finally {
      loadingRef.current = false
    }
  }, [fetchMessages]) // 只依赖fetchMessages

  // 添加 useEffect 处理 activeTab 变化
  useEffect(() => {
    console.log(`MessageCenter: activeTab 变化: ${activeTab}`)
    // 重置状态
    setHasMore(true)
    loadMessages(1, activeTab)
  }, [activeTab]) // 移除loadMessages依赖

  const loadMore = async () => {
    const nextPage = messagePagination.page + 1
    await loadMessages(nextPage)
  }

  const handleRefresh = async () => {
    setHasMore(true)
    await loadMessages(1)
  }

  const handleMessageClick = async (messageId: string) => {
    if (selectMode) {
      // 批量选择模式
      if (selectedIds.includes(messageId)) {
        setSelectedIds(selectedIds.filter(id => id !== messageId))
      } else {
        setSelectedIds([...selectedIds, messageId])
      }
    } else {
      // 查看详情并标记已读
      const message = messages.find(m => m.id === messageId)
      if (message?.status === MessageStatus.UNREAD) {
        await markAsRead(messageId)
      }
      navigate(`/messages/${messageId}`)
    }
  }

  const handleSelectAll = () => {
    if (selectedIds.length === messages.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(messages.map(m => m.id))
    }
  }

  const handleBatchMarkRead = async () => {
    if (selectedIds.length === 0) {
      Toast.show('请选择要标记的消息')
      return
    }

    try {
      await batchMarkAsRead(selectedIds)
      setSelectedIds([])
      setSelectMode(false)
      Toast.show('标记成功')
    } catch (error) {
      Toast.show('标记失败')
    }
  }

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) {
      Toast.show('请选择要删除的消息')
      return
    }

    Dialog.confirm({
      title: '删除消息',
      content: `确定要删除选中的 ${selectedIds.length} 条消息吗？`,
      onConfirm: async () => {
        try {
          await batchDeleteMessages(selectedIds)
          setSelectedIds([])
          setSelectMode(false)
          Toast.show('删除成功')
        } catch (error) {
          Toast.show('删除失败')
        }
      }
    })
  }

  const handleMarkAllRead = async () => {
    const unreadIds = messages
      .filter(m => m.status === MessageStatus.UNREAD)
      .map(m => m.id)
    
    if (unreadIds.length === 0) {
      Toast.show('没有未读消息')
      return
    }

    try {
      await batchMarkAsRead(unreadIds)
      Toast.show('全部标记已读')
    } catch (error) {
      Toast.show('标记失败')
    }
  }

  return (
    <div className="message-center-page">
      <NavBar 
        onBack={() => navigate(-1)}
        right={
          <Space>
            {!selectMode ? (
              <>
                <Button 
                  size="small" 
                  fill="none"
                  onClick={handleMarkAllRead}
                >
                  全部已读
                </Button>
                <Button 
                  size="small" 
                  fill="none"
                  onClick={() => setSelectMode(true)}
                >
                  管理
                </Button>
              </>
            ) : (
              <>
                <Button 
                  size="small" 
                  fill="none"
                  onClick={() => {
                    setSelectMode(false)
                    setSelectedIds([])
                  }}
                >
                  取消
                </Button>
              </>
            )}
          </Space>
        }
      >
        消息中心
      </NavBar>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        className="message-tabs"
      >
        <Tabs.Tab title="全部" key="all" />
        <Tabs.Tab title="未读" key="unread" />
        <Tabs.Tab title="邀请" key="invitation" />
        <Tabs.Tab title="系统" key="system" />
      </Tabs>

      {selectMode && (
        <div className="select-toolbar">
          <Checkbox
            checked={selectedIds.length === messages.length && messages.length > 0}
            indeterminate={selectedIds.length > 0 && selectedIds.length < messages.length}
            onChange={handleSelectAll}
          >
            全选 ({selectedIds.length}/{messages.length})
          </Checkbox>
          <Space>
            <Button 
              size="small" 
              color="primary"
              onClick={handleBatchMarkRead}
            >
              标记已读
            </Button>
            <Button 
              size="small" 
              color="danger"
              onClick={handleBatchDelete}
            >
              删除
            </Button>
          </Space>
        </div>
      )}

      <PullToRefresh onRefresh={handleRefresh}>
        <div className="message-list">
          {messageLoading && messages.length === 0 ? (
            <Loading />
          ) : messages.length === 0 ? (
            <Empty description="暂无消息" />
          ) : (
            <>
              {messages.map(message => (
                <div key={message.id} className="message-item">
                  {selectMode && (
                    <Checkbox
                      checked={selectedIds.includes(message.id)}
                      className="message-checkbox"
                    />
                  )}
                  <div className="message-card-wrapper">
                    <MessageCard
                      message={message}
                      onClick={() => handleMessageClick(message.id)}
                    />
                  </div>
                </div>
              ))}
              <InfiniteScroll
                loadMore={loadMore}
                hasMore={hasMore && messages.length > 0}
              />
            </>
          )}
        </div>
      </PullToRefresh>
    </div>
  )
}

export default MessageCenter