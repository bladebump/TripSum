import React from 'react'
import { Badge } from 'antd-mobile'
import { MessageOutline } from 'antd-mobile-icons'

interface MessageBadgeProps {
  count: number
  onClick?: () => void
  showIcon?: boolean
  size?: 'small' | 'medium' | 'large'
}

const MessageBadge: React.FC<MessageBadgeProps> = ({ 
  count, 
  onClick,
  showIcon = true,
  size = 'medium'
}) => {
  const iconSize = size === 'small' ? 20 : size === 'large' ? 28 : 24
  
  if (!showIcon) {
    return <Badge content={count > 99 ? '99+' : count || null} />
  }
  
  return (
    <div 
      className="message-badge-wrapper" 
      onClick={onClick}
      style={{ 
        position: 'relative', 
        cursor: onClick ? 'pointer' : 'default',
        display: 'inline-block'
      }}
    >
      <MessageOutline fontSize={iconSize} />
      {count > 0 && (
        <Badge 
          content={count > 99 ? '99+' : count}
          style={{
            position: 'absolute',
            top: -4,
            right: -4
          } as React.CSSProperties}
        />
      )}
    </div>
  )
}

export default MessageBadge