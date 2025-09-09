import React, { useState } from 'react'
import { Form, Radio, TextArea, List, Avatar, Button, Space, Empty } from 'antd-mobile'
import { UserSearchResult, InviteType, CreateInvitationDTO } from '@/types/invitation.types'
import { TripMember } from '@/types/trip.types'
import styles from './InvitationForm.module.css'

interface InvitationFormProps {
  selectedUser: UserSearchResult
  virtualMembers: TripMember[]
  onSubmit: (invitation: CreateInvitationDTO) => void
  onCancel: () => void
  loading?: boolean
}

const InvitationForm: React.FC<InvitationFormProps> = ({
  selectedUser,
  virtualMembers,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [inviteType, setInviteType] = useState<InviteType>(
    virtualMembers.length > 0 ? InviteType.REPLACE : InviteType.ADD
  )
  const [targetMemberId, setTargetMemberId] = useState<string>('')
  const [message, setMessage] = useState('')

  // 获取虚拟成员显示名称
  const getVirtualMemberName = (member: TripMember) => {
    return member.displayName || '虚拟成员'
  }

  // 获取虚拟成员头像内容
  const getAvatarContent = (member: TripMember) => {
    const name = getVirtualMemberName(member)
    return name.charAt(0).toUpperCase()
  }

  // 处理提交
  const handleSubmit = () => {
    // 验证
    if (inviteType === InviteType.REPLACE && !targetMemberId) {
      return
    }

    const invitationData: CreateInvitationDTO = {
      invitedUserId: selectedUser.id,
      inviteType,
      message: message.trim() || undefined
    }

    if (inviteType === InviteType.REPLACE) {
      invitationData.targetMemberId = targetMemberId
    }

    onSubmit(invitationData)
  }

  // 获取用户显示名称
  const getUserDisplayName = (user: UserSearchResult) => {
    return user.username || user.email.split('@')[0]
  }

  return (
    <div className={styles.invitationForm}>
      {/* 选中的用户信息 */}
      <div className={styles.selectedUser}>
        <div className={styles.userInfo}>
          <Avatar 
            src={selectedUser.avatarUrl || ''} 
            style={{ '--size': '48px' }}
            fallback={<div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#1890ff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              {getUserDisplayName(selectedUser).charAt(0).toUpperCase()}
            </div>}
          />
          <div className={styles.userDetails}>
            <div className={styles.userName}>{getUserDisplayName(selectedUser)}</div>
            <div className={styles.userEmail}>{selectedUser.email}</div>
          </div>
        </div>
      </div>

      <Form layout='vertical'>
        {/* 邀请类型选择 */}
        <Form.Item label='邀请类型'>
          <Radio.Group
            value={inviteType}
            onChange={(val) => {
              setInviteType(val as InviteType)
              setTargetMemberId('')
            }}
          >
            <Space direction='vertical' block>
              {virtualMembers.length > 0 && (
                <Radio value={InviteType.REPLACE} block>
                  <div className={styles.radioOption}>
                    <div className={styles.radioTitle}>替换虚拟成员</div>
                    <div className={styles.radioDesc}>
                      选择一个虚拟成员，邀请用户将继承其所有数据
                    </div>
                  </div>
                </Radio>
              )}
              <Radio value={InviteType.ADD} block>
                <div className={styles.radioOption}>
                  <div className={styles.radioTitle}>作为新成员加入</div>
                  <div className={styles.radioDesc}>
                    用户将作为全新成员加入行程
                  </div>
                </div>
              </Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        {/* 虚拟成员选择 */}
        {inviteType === InviteType.REPLACE && virtualMembers.length > 0 && (
          <Form.Item 
            label='选择要替换的虚拟成员'
            extra={!targetMemberId ? '请选择一个虚拟成员' : undefined}
          >
            {virtualMembers.length === 0 ? (
              <Empty description='暂无虚拟成员' />
            ) : (
              <List className={styles.virtualMemberList}>
                {virtualMembers.map(member => (
                  <List.Item
                    key={member.id}
                    onClick={() => setTargetMemberId(member.id)}
                    clickable
                    prefix={
                      <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#f0f0f0', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                        {getAvatarContent(member)}
                      </div>
                    }
                    extra={
                      <Radio
                        checked={targetMemberId === member.id}
                        onChange={() => setTargetMemberId(member.id)}
                      />
                    }
                    description={
                      member.balance !== undefined ? 
                        `余额: ¥${member.balance.toFixed(2)}` : 
                        '虚拟成员'
                    }
                  >
                    {getVirtualMemberName(member)}
                  </List.Item>
                ))}
              </List>
            )}
          </Form.Item>
        )}

        {/* 邀请留言 */}
        <Form.Item label='邀请留言（可选）'>
          <TextArea
            placeholder='可以添加一些邀请说明或留言...'
            value={message}
            onChange={setMessage}
            rows={3}
            maxLength={200}
            showCount
          />
        </Form.Item>
      </Form>

      {/* 操作按钮 */}
      <div className={styles.actions}>
        <Button
          block
          color='primary'
          size='large'
          loading={loading}
          disabled={inviteType === InviteType.REPLACE && !targetMemberId}
          onClick={handleSubmit}
        >
          发送邀请
        </Button>
        <Button
          block
          size='large'
          fill='outline'
          onClick={onCancel}
          disabled={loading}
        >
          取消
        </Button>
      </div>
    </div>
  )
}

export default InvitationForm