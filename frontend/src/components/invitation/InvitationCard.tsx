import React from 'react'
import { Card, Tag, Button, Space, Avatar } from 'antd-mobile'
import { 
  ClockCircleOutline, 
  UserOutline,
  SwapOutline,
  AddCircleOutline
} from 'antd-mobile-icons'
import { 
  InvitationWithRelations, 
  InvitationStatus, 
  InviteType 
} from '@/types/invitation.types'
import { formatDateTime } from '@/utils/format'
import styles from './InvitationCard.module.css'

interface InvitationCardProps {
  invitation: InvitationWithRelations
  onAccept?: (id: string) => void
  onReject?: (id: string) => void
  loading?: boolean
}

const InvitationCard: React.FC<InvitationCardProps> = ({
  invitation,
  onAccept,
  onReject,
  loading = false
}) => {
  // 获取状态标签配置
  const getStatusConfig = (status: InvitationStatus) => {
    switch (status) {
      case InvitationStatus.PENDING:
        return { text: '待处理', color: 'warning' }
      case InvitationStatus.ACCEPTED:
        return { text: '已接受', color: 'success' }
      case InvitationStatus.REJECTED:
        return { text: '已拒绝', color: 'danger' }
      case InvitationStatus.EXPIRED:
        return { text: '已过期', color: 'default' }
      case InvitationStatus.CANCELLED:
        return { text: '已取消', color: 'default' }
      default:
        return { text: '未知', color: 'default' }
    }
  }

  // 获取邀请类型描述
  const getInviteTypeDesc = () => {
    if (invitation.inviteType === InviteType.REPLACE && invitation.targetMember) {
      return `替换虚拟成员「${invitation.targetMember.displayName || '虚拟成员'}」`
    }
    return '作为新成员加入'
  }

  // 获取邀请人显示名称
  const getInviterName = () => {
    return invitation.inviter.username || invitation.inviter.email?.split('@')[0] || '未知用户'
  }

  // 检查是否已过期
  const isExpired = () => {
    return new Date(invitation.expiresAt) < new Date()
  }

  // 是否显示操作按钮
  const showActions = () => {
    return invitation.status === InvitationStatus.PENDING && 
           !isExpired() && 
           (onAccept || onReject)
  }

  const statusConfig = getStatusConfig(invitation.status)

  return (
    <Card className={styles.invitationCard}>
      {/* 头部：行程信息和状态 */}
      <div className={styles.header}>
        <div className={styles.tripInfo}>
          <h3 className={styles.tripName}>{invitation.trip.name}</h3>
          {invitation.trip.description && (
            <div className={styles.tripDesc}>{invitation.trip.description}</div>
          )}
        </div>
        <Tag color={statusConfig.color} fill='outline'>
          {statusConfig.text}
        </Tag>
      </div>

      {/* 邀请信息 */}
      <div className={styles.inviteInfo}>
        {/* 邀请人 */}
        <div className={styles.infoItem}>
          {invitation.inviter.avatarUrl ? (
            <Avatar src={invitation.inviter.avatarUrl} style={{ '--size': '24px' }} />
          ) : (
            <UserOutline className={styles.icon} />
          )}
          <span className={styles.label}>邀请人：</span>
          <span className={styles.value}>{getInviterName()}</span>
        </div>

        {/* 邀请类型 */}
        <div className={styles.infoItem}>
          {invitation.inviteType === InviteType.REPLACE ? (
            <SwapOutline className={styles.icon} />
          ) : (
            <AddCircleOutline className={styles.icon} />
          )}
          <span className={styles.label}>邀请类型：</span>
          <span className={styles.value}>{getInviteTypeDesc()}</span>
        </div>

        {/* 时间信息 */}
        <div className={styles.infoItem}>
          <ClockCircleOutline className={styles.icon} />
          <span className={styles.label}>邀请时间：</span>
          <span className={styles.value}>{formatDateTime(invitation.createdAt)}</span>
        </div>

        {/* 过期时间（待处理状态） */}
        {invitation.status === InvitationStatus.PENDING && (
          <div className={styles.infoItem}>
            <ClockCircleOutline className={styles.icon} />
            <span className={styles.label}>过期时间：</span>
            <span className={styles.value}>
              {formatDateTime(invitation.expiresAt)}
              {isExpired() && <span className={styles.expired}>（已过期）</span>}
            </span>
          </div>
        )}

        {/* 响应时间（已响应状态） */}
        {invitation.respondedAt && (
          <div className={styles.infoItem}>
            <ClockCircleOutline className={styles.icon} />
            <span className={styles.label}>响应时间：</span>
            <span className={styles.value}>{formatDateTime(invitation.respondedAt)}</span>
          </div>
        )}
      </div>

      {/* 邀请留言 */}
      {invitation.message && (
        <div className={styles.message}>
          <div className={styles.messageLabel}>邀请留言：</div>
          <div className={styles.messageContent}>{invitation.message}</div>
        </div>
      )}

      {/* 行程信息 */}
      <div className={styles.tripStats}>
        <span>已有 {invitation.trip.memberCount} 名成员</span>
      </div>

      {/* 操作按钮 */}
      {showActions() && (
        <div className={styles.actions}>
          <Space block>
            {onAccept && (
              <Button
                color='primary'
                size='small'
                loading={loading}
                onClick={() => onAccept(invitation.id)}
                block
              >
                接受邀请
              </Button>
            )}
            {onReject && (
              <Button
                size='small'
                fill='outline'
                loading={loading}
                onClick={() => onReject(invitation.id)}
                block
              >
                拒绝
              </Button>
            )}
          </Space>
        </div>
      )}
    </Card>
  )
}

export default InvitationCard