import React from 'react'
import { Card, Tag } from 'antd-mobile'
import {
  SystemQRcodeOutline,
  TeamOutline,
  BillOutline,
  PayCircleOutline,
  CheckCircleOutline
} from 'antd-mobile-icons'
import { MessageWithSender, MessageType, MessagePriority, MessageStatus } from '@/types'
import { formatDate } from '@/utils/format'
import './MessageCard.scss'

interface MessageCardProps {
  message: MessageWithSender
  onClick?: () => void
}

const MessageCard: React.FC<MessageCardProps> = ({ message, onClick }) => {
  // 根据消息类型获取图标
  const getMessageIcon = () => {
    switch (message.type) {
      case MessageType.TRIP_INVITATION:
      case MessageType.TRIP_INVITATION_ACCEPTED:
      case MessageType.TRIP_INVITATION_REJECTED:
      case MessageType.TRIP_MEMBER_JOINED:
      case MessageType.TRIP_MEMBER_LEFT:
        return <TeamOutline className="message-icon invitation" />
      case MessageType.EXPENSE_CREATED:
      case MessageType.EXPENSE_UPDATED:
      case MessageType.EXPENSE_DELETED:
      case MessageType.EXPENSE_MENTIONED:
        return <BillOutline className="message-icon expense" />
      case MessageType.SETTLEMENT_REMINDER:
      case MessageType.SETTLEMENT_RECEIVED:
      case MessageType.SETTLEMENT_CONFIRMED:
        return <PayCircleOutline className="message-icon settlement" />
      case MessageType.SYSTEM_ANNOUNCEMENT:
      case MessageType.SYSTEM_MAINTENANCE:
      case MessageType.FEATURE_UPDATE:
      case MessageType.CUSTOM:
      default:
        return <SystemQRcodeOutline className="message-icon system" />
    }
  }

  // 根据消息状态获取图标
  const getStatusIcon = () => {
    if (message.status === MessageStatus.READ) {
      return <CheckCircleOutline className="status-icon read" />
    }
    return null
  }

  // 获取优先级标签
  const getPriorityTag = () => {
    if (message.priority === MessagePriority.HIGH) {
      return <Tag color="danger" fill="outline">紧急</Tag>
    }
    if (message.priority === MessagePriority.LOW) {
      return <Tag color="default" fill="outline">低优先级</Tag>
    }
    return null
  }

  return (
    <Card 
      className={`message-card ${message.status === MessageStatus.UNREAD ? 'unread' : ''}`}
      onClick={onClick}
    >
      <div className="message-header">
        <div className="message-left">
          {getMessageIcon()}
          <div className="message-info">
            <div className="message-title-row">
              <span className="message-title">{message.title}</span>
              {getPriorityTag()}
            </div>
            <div className="message-meta">
              {message.sender && (
                <span className="sender">{message.sender.username}</span>
              )}
              <span className="time">{formatDate(message.createdAt)}</span>
            </div>
          </div>
        </div>
        {getStatusIcon()}
      </div>
      <div className="message-content">
        {message.content}
      </div>
      {message.actions && message.actions.length > 0 && (
        <div className="message-actions">
          {message.actions.map((action, index) => (
            <Tag 
              key={index} 
              color="primary" 
              fill="outline"
              className="action-tag"
            >
              {action.label}
            </Tag>
          ))}
        </div>
      )}
    </Card>
  )
}

export default MessageCard