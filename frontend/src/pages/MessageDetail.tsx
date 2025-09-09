import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NavBar, Card, Button, Space, Tag, Dialog, Toast, Avatar } from 'antd-mobile'
import { 
  InformationCircleOutline,
  TeamOutline,
  BillOutline,
  CheckCircleOutline,
  ClockCircleOutline,
  UserOutline
} from 'antd-mobile-icons'
import messageService from '@/services/message.service'
import invitationService from '@/services/invitation.service'
import { MessageWithSender, MessageType, MessagePriority, MessageAction } from '@/types/message.types'
import { formatDateTime } from '@/utils/format'
import Loading from '@/components/common/Loading'
import styles from './MessageDetail.module.css'

const MessageDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [message, setMessage] = useState<MessageWithSender | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // 初始化加载
  useEffect(() => {
    if (id) {
      loadMessageDetail()
    }
  }, [id])

  // 加载消息详情
  const loadMessageDetail = async () => {
    if (!id) return

    setLoading(true)
    try {
      const data = await messageService.getMessageDetail(id)
      setMessage(data)
      
      // 如果消息未读，标记为已读
      if (data.status === 'UNREAD') {
        await messageService.markAsRead(id)
      }
    } catch (error) {
      console.error('加载消息详情失败:', error)
      Toast.show({
        content: '加载消息详情失败',
        icon: 'fail'
      })
      navigate(-1)
    } finally {
      setLoading(false)
    }
  }

  // 获取消息类型图标
  const getMessageIcon = (type: MessageType) => {
    switch (type) {
      case MessageType.SYSTEM:
        return <InformationCircleOutline className={styles.typeIcon} />
      case MessageType.INVITATION:
        return <TeamOutline className={styles.typeIcon} />
      case MessageType.EXPENSE:
        return <BillOutline className={styles.typeIcon} />
      case MessageType.SETTLEMENT:
        return <CheckCircleOutline className={styles.typeIcon} />
      case MessageType.REMINDER:
        return <ClockCircleOutline className={styles.typeIcon} />
      default:
        return <InformationCircleOutline className={styles.typeIcon} />
    }
  }

  // 获取优先级颜色
  const getPriorityColor = (priority: MessagePriority) => {
    switch (priority) {
      case MessagePriority.HIGH:
        return 'danger'
      case MessagePriority.MEDIUM:
        return 'warning'
      case MessagePriority.LOW:
      default:
        return 'default'
    }
  }

  // 处理消息操作
  const handleAction = async (action: MessageAction) => {
    // 如果需要确认
    if (action.confirmRequired) {
      const result = await Dialog.confirm({
        content: action.confirmText || '确定执行此操作吗？',
        confirmText: '确定',
        cancelText: '取消'
      })
      
      if (!result) return
    }

    setActionLoading(true)
    try {
      // 特殊处理邀请接受/拒绝操作
      if (message?.type === MessageType.INVITATION && message.relatedEntity) {
        const invitationId = message.relatedEntity.id
        
        if (action.type === 'accept') {
          const result = await invitationService.acceptInvitation(invitationId)
          Toast.show({
            content: result.message || '操作成功',
            icon: 'success'
          })
        } else if (action.type === 'reject') {
          await invitationService.rejectInvitation(invitationId)
          Toast.show({
            content: '已拒绝邀请',
            icon: 'success'
          })
        }
        
        // 刷新消息详情
        await loadMessageDetail()
      } else if (action.url) {
        // 跳转到指定URL
        navigate(action.url)
      } else {
        Toast.show({
          content: '操作成功',
          icon: 'success'
        })
      }
    } catch (error: any) {
      console.error('执行操作失败:', error)
      Toast.show({
        content: error.message || '操作失败',
        icon: 'fail'
      })
    } finally {
      setActionLoading(false)
    }
  }

  // 渲染消息元数据
  const renderMetadata = () => {
    if (!message?.metadata) return null

    // 根据消息类型渲染不同的元数据
    switch (message.type) {
      case MessageType.INVITATION:
        return (
          <div className={styles.metadata}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>行程：</span>
              <span className={styles.metaValue}>{message.metadata.tripName}</span>
            </div>
            {message.metadata.inviteType && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>邀请类型：</span>
                <span className={styles.metaValue}>
                  {message.metadata.inviteType === 'REPLACE' ? '替换虚拟成员' : '新增成员'}
                </span>
              </div>
            )}
            {message.metadata.targetMemberName && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>替换对象：</span>
                <span className={styles.metaValue}>{message.metadata.targetMemberName}</span>
              </div>
            )}
          </div>
        )
      
      case MessageType.EXPENSE:
        return (
          <div className={styles.metadata}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>支出金额：</span>
              <span className={styles.metaValue}>¥{message.metadata.amount}</span>
            </div>
            {message.metadata.description && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>支出说明：</span>
                <span className={styles.metaValue}>{message.metadata.description}</span>
              </div>
            )}
          </div>
        )
      
      case MessageType.SETTLEMENT:
        return (
          <div className={styles.metadata}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>结算金额：</span>
              <span className={styles.metaValue}>¥{message.metadata.amount}</span>
            </div>
            {message.metadata.from && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>付款方：</span>
                <span className={styles.metaValue}>{message.metadata.from}</span>
              </div>
            )}
            {message.metadata.to && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>收款方：</span>
                <span className={styles.metaValue}>{message.metadata.to}</span>
              </div>
            )}
          </div>
        )
      
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <NavBar onBack={() => navigate(-1)}>消息详情</NavBar>
        <Loading />
      </div>
    )
  }

  if (!message) {
    return (
      <div className={styles.container}>
        <NavBar onBack={() => navigate(-1)}>消息详情</NavBar>
        <div className={styles.empty}>消息不存在</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <NavBar onBack={() => navigate(-1)}>消息详情</NavBar>
      
      <div className={styles.content}>
        <Card className={styles.messageCard}>
          {/* 消息头部 */}
          <div className={styles.header}>
            <div className={styles.typeInfo}>
              {getMessageIcon(message.type)}
              <span className={styles.typeName}>
                {message.type === MessageType.SYSTEM && '系统消息'}
                {message.type === MessageType.INVITATION && '邀请通知'}
                {message.type === MessageType.EXPENSE && '费用通知'}
                {message.type === MessageType.SETTLEMENT && '结算通知'}
                {message.type === MessageType.REMINDER && '提醒'}
              </span>
            </div>
            <Tag color={getPriorityColor(message.priority)} fill='outline'>
              {message.priority === MessagePriority.HIGH && '重要'}
              {message.priority === MessagePriority.MEDIUM && '一般'}
              {message.priority === MessagePriority.LOW && '普通'}
            </Tag>
          </div>

          {/* 消息标题 */}
          <h2 className={styles.title}>{message.title}</h2>

          {/* 发送者信息 */}
          {message.sender && (
            <div className={styles.sender}>
              {message.sender.avatarUrl ? (
                <Avatar src={message.sender.avatarUrl} style={{ '--size': '24px' }} />
              ) : (
                <UserOutline className={styles.senderIcon} />
              )}
              <span className={styles.senderName}>{message.sender.username}</span>
              <span className={styles.sendTime}>{formatDateTime(message.createdAt)}</span>
            </div>
          )}

          {/* 消息内容 */}
          <div className={styles.messageContent}>
            {message.content}
          </div>

          {/* 消息元数据 */}
          {renderMetadata()}

          {/* 过期时间 */}
          {message.expiresAt && (
            <div className={styles.expires}>
              <ClockCircleOutline className={styles.expiresIcon} />
              <span>过期时间：{formatDateTime(message.expiresAt)}</span>
            </div>
          )}

          {/* 操作按钮 */}
          {message.actions && message.actions.length > 0 && (
            <div className={styles.actions}>
              <Space block direction='vertical'>
                {message.actions.map((action, index) => (
                  <Button
                    key={index}
                    color={action.type === 'accept' ? 'primary' : 'default'}
                    fill={action.type === 'reject' ? 'outline' : 'solid'}
                    size='middle'
                    loading={actionLoading}
                    onClick={() => handleAction(action)}
                    block
                  >
                    {action.label}
                  </Button>
                ))}
              </Space>
            </div>
          )}
        </Card>

        {/* 消息状态 */}
        <div className={styles.statusInfo}>
          {message.readAt && (
            <div className={styles.statusItem}>
              已读时间：{formatDateTime(message.readAt)}
            </div>
          )}
          <div className={styles.statusItem}>
            接收时间：{formatDateTime(message.createdAt)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MessageDetail