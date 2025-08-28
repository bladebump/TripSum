import React, { useEffect, useRef } from 'react'
import { formatDate } from '@/utils/format'
import type { Message } from '@/hooks/chat'

interface ChatMessagesProps {
  messages: Message[]
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  return (
    <div className="messages-container">
      {messages.map((message) => (
        <div key={message.id} className={`message message-${message.type}`}>
          <div className="message-content">
            {message.content}
          </div>
          <div className="message-time">{formatDate(message.timestamp, 'HH:mm')}</div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
}