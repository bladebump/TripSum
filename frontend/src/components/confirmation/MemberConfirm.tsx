import React, { useState, useEffect } from 'react'
import { Input, Tag, Space, Divider } from 'antd-mobile'
import { DeleteOutline, AddOutline } from 'antd-mobile-icons'
import BaseConfirm from './BaseConfirm'

interface MemberData {
  displayName: string
  confidence?: number
  selected?: boolean
}

interface MemberConfirmProps {
  visible: boolean
  title: string
  members: MemberData[]
  onClose: () => void
  onConfirm: (members: string[]) => void
  loading?: boolean
  allowEdit?: boolean
}

const MemberConfirm: React.FC<MemberConfirmProps> = ({
  visible,
  title,
  members,
  onClose,
  onConfirm,
  loading = false,
  allowEdit = true
}) => {
  const [editableMembers, setEditableMembers] = useState<string[]>([])

  useEffect(() => {
    if (visible && members) {
      setEditableMembers(
        members
          .filter(m => m.selected !== false)
          .map(m => m.displayName)
      )
    }
  }, [visible, members])

  const updateMember = (index: number, value: string) => {
    const updated = [...editableMembers]
    updated[index] = value
    setEditableMembers(updated)
  }

  const addMember = () => {
    setEditableMembers([...editableMembers, ''])
  }

  const removeMember = (index: number) => {
    if (editableMembers.length > 1) {
      setEditableMembers(editableMembers.filter((_, i) => i !== index))
    }
  }

  const handleConfirm = () => {
    const validMembers = editableMembers.filter(name => name.trim().length > 0)
    onConfirm(validMembers)
  }

  const actions = [
    {
      key: 'confirm',
      text: '确认添加',
      color: 'primary' as const,
      loading,
      onClick: handleConfirm
    }
  ]

  const renderContent = () => (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
          将添加以下成员到旅行中：
        </div>
        
        {members.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
              AI识别结果：
            </div>
            <Space wrap>
              {members.map((member, index) => (
                <Tag
                  key={index}
                  color={
                    member.confidence && member.confidence > 0.7 
                      ? 'success' 
                      : member.confidence && member.confidence > 0.4
                      ? 'warning'
                      : 'default'
                  }
                >
                  {member.displayName}
                  {member.confidence && (
                    <span style={{ opacity: 0.7 }}>
                      {' '}({Math.round(member.confidence * 100)}%)
                    </span>
                  )}
                </Tag>
              ))}
            </Space>
          </div>
        )}

        <Divider />
      </div>

      {allowEdit && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            确认成员列表：
          </div>
          
          {editableMembers.map((member, index) => (
            <div 
              key={index} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                marginBottom: 8 
              }}
            >
              <Input
                placeholder={`成员 ${index + 1}`}
                value={member}
                onChange={(value) => updateMember(index, value)}
                style={{ flex: 1 }}
              />
              {editableMembers.length > 1 && (
                <div
                  onClick={() => removeMember(index)}
                  style={{ 
                    color: '#ff4d4f', 
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <DeleteOutline />
                </div>
              )}
            </div>
          ))}

          <div
            onClick={addMember}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: '#1890ff',
              cursor: 'pointer',
              fontSize: 14,
              marginTop: 8
            }}
          >
            <AddOutline fontSize={16} />
            添加更多成员
          </div>
        </div>
      )}
    </div>
  )

  return (
    <BaseConfirm
      visible={visible}
      title={title}
      onClose={onClose}
      actions={actions}
    >
      {renderContent()}
    </BaseConfirm>
  )
}

export default MemberConfirm