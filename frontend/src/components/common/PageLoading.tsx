import React from 'react'
import { SpinLoading } from 'antd-mobile'

const PageLoading: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      flexDirection: 'column'
    }}>
      <SpinLoading style={{ '--size': '48px' }} />
      <div style={{ marginTop: '16px', color: '#999' }}>加载中...</div>
    </div>
  )
}

export default PageLoading