import React from 'react'
import { Card, Tag } from 'antd-mobile'
import {
  SystemQRcodeOutline,
  TeamOutline,
  BillOutline,
  PayCircleOutline,
  ClockCircleOutline,
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
      case MessageType.INVITATION:
        return <TeamOutline className="message-icon invitation" />
      case MessageType.EXPENSE:
        return <BillOutline className="message-icon expense" />
      case MessageType.SETTLEMENT:
        return <PayCircleOutline className="message-icon settlement" />
      case MessageType.REMINDER:
        return <ClockCircleOutline className="message-icon reminder" />
      case MessageType.SYSTEM:
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