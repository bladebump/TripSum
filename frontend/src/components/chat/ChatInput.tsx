import React from 'react'
import { Input, Button } from 'antd-mobile'
import { SendOutline } from 'antd-mobile-icons'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  loading?: boolean
  disabled?: boolean
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  loading = false,
  disabled = false
}) => {

  return (
    <div className="input-container">
      <div className="input-row">
        <Input
          placeholder="输入消费信息或问题..."
          value={value}
          onChange={onChange}
          onEnterPress={() => !loading && !disabled && onSend()}
          disabled={loading || disabled}
        />
        <Button
          color="primary"
          size="small"
          onClick={onSend}
          disabled={!value.trim() || loading || disabled}
          loading={loading}
        >
          <SendOutline />
        </Button>
      </div>
    </div>
  )
}