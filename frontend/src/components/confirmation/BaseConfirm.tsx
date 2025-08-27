import React from 'react'
import { Dialog } from 'antd-mobile'

interface BaseConfirmProps {
  visible: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  actions?: Array<{
    key: string
    text: string
    color?: 'primary' | 'danger'
    loading?: boolean
    onClick: () => void
  }>
}

const BaseConfirm: React.FC<BaseConfirmProps> = ({
  visible,
  title,
  onClose,
  children,
  actions = []
}) => {
  const defaultActions = [
    {
      key: 'cancel',
      text: '取消',
      onClick: onClose
    }
  ]

  return (
    <Dialog
      visible={visible}
      title={title}
      content={children}
      actions={[...defaultActions, ...actions]}
      onClose={onClose}
    />
  )
}

export default BaseConfirm