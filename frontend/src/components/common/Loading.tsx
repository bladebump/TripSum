import React from 'react'
import { SpinLoading, DotLoading } from 'antd-mobile'

interface LoadingProps {
  type?: 'page' | 'inline' | 'dots'
  text?: string
}

const Loading: React.FC<LoadingProps> = ({ type = 'page', text }) => {
  if (type === 'dots') {
    return <DotLoading color='primary' />
  }

  if (type === 'inline') {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <SpinLoading style={{ '--size': '20px' }} />
        {text && <span>{text}</span>}
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: 16,
    }}>
      <SpinLoading style={{ '--size': '48px' }} />
      {text && <div style={{ color: '#999', fontSize: 14 }}>{text}</div>}
    </div>
  )
}

export default Loading