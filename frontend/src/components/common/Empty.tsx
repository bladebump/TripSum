import React from 'react'
import { ErrorBlock } from 'antd-mobile'

interface EmptyProps {
  title?: string
  description?: string
  image?: 'default' | 'disconnected' | 'empty' | 'busy'
  children?: React.ReactNode
}

const Empty: React.FC<EmptyProps> = ({ 
  title = '暂无数据', 
  description,
  image = 'empty',
  children 
}) => {
  return (
    <ErrorBlock
      status={image}
      title={title}
      description={description}
    >
      {children}
    </ErrorBlock>
  )
}

export default Empty