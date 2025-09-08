import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NavBar, Steps, Toast } from 'antd-mobile'
import { useTripStore } from '@/stores/trip.store'
import { useAuthStore } from '@/stores/auth.store'
import UserSearch from '@/components/invitation/UserSearch'
import InvitationForm from '@/components/invitation/InvitationForm'
import invitationService from '@/services/invitation.service'
import { UserSearchResult, CreateInvitationDTO } from '@/types/invitation.types'
import { TripMember } from '@/types/trip.types'
import Loading from '@/components/common/Loading'
import styles from './InviteMember.module.css'

const InviteMember: React.FC = () => {
  const { id: tripId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentTrip, members, fetchTripDetail } = useTripStore()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [virtualMembers, setVirtualMembers] = useState<TripMember[]>([])
  const [existingUserIds, setExistingUserIds] = useState<string[]>([])

  // 初始化数据
  useEffect(() => {
    if (tripId && !currentTrip) {
      loadTripData()
    } else if (currentTrip && members) {
      processMembers()
    }
  }, [tripId, currentTrip, members])

  // 加载行程数据
  const loadTripData = async () => {
    if (!tripId) return
    
    setLoading(true)
    try {
      await fetchTripDetail(tripId)
    } catch (error) {
      console.error('加载行程数据失败:', error)
      Toast.show({
        content: '加载行程数据失败',
        icon: 'fail'
      })
      navigate(-1)
    } finally {
      setLoading(false)
    }
  }

  // 处理成员数据
  const processMembers = () => {
    if (!members) return

    // 获取虚拟成员
    const virtuals = members.filter(m => m.isVirtual)
    setVirtualMembers(virtuals)

    // 获取已存在的用户ID（用于搜索时排除）
    const userIds = members
      .filter(m => !m.isVirtual && m.userId)
      .map(m => m.userId!)
    
    // 添加当前用户ID到排除列表
    if (user?.id) {
      userIds.push(user.id)
    }
    
    setExistingUserIds(userIds)
  }

  // 处理用户选择
  const handleUserSelect = (user: UserSearchResult) => {
    setSelectedUser(user)
  }

  // 处理邀请提交
  const handleInvitationSubmit = async (invitation: CreateInvitationDTO) => {
    if (!tripId) return

    setSubmitLoading(true)
    try {
      await invitationService.sendInvitation(tripId, invitation)
      
      Toast.show({
        content: '邀请已发送',
        icon: 'success'
      })
      
      // 返回上一页
      navigate(-1)
    } catch (error: any) {
      console.error('发送邀请失败:', error)
      Toast.show({
        content: error.message || '发送邀请失败',
        icon: 'fail'
      })
    } finally {
      setSubmitLoading(false)
    }
  }

  // 处理返回
  const handleBack = () => {
    if (selectedUser) {
      // 如果已选择用户，返回到搜索
      setSelectedUser(null)
    } else {
      // 否则返回上一页
      navigate(-1)
    }
  }

  // 检查是否是管理员
  const isAdmin = () => {
    if (!user || !members) return false
    const currentMember = members.find(m => m.userId === user.id)
    return currentMember?.role === 'admin'
  }

  // 如果不是管理员，显示无权限提示
  if (!loading && !isAdmin()) {
    return (
      <div className={styles.container}>
        <NavBar onBack={() => navigate(-1)}>邀请成员</NavBar>
        <div className={styles.noPermission}>
          <div className={styles.noPermissionText}>仅管理员可以邀请成员</div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <NavBar onBack={() => navigate(-1)}>邀请成员</NavBar>
        <Loading />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <NavBar onBack={handleBack}>
        {selectedUser ? '发送邀请' : '邀请成员'}
      </NavBar>

      {/* 步骤指示器 */}
      <div className={styles.steps}>
        <Steps
          current={selectedUser ? 1 : 0}
          direction='horizontal'
        >
          <Steps.Step title='搜索用户' />
          <Steps.Step title='发送邀请' />
        </Steps>
      </div>

      {/* 内容区域 */}
      <div className={styles.content}>
        {!selectedUser ? (
          <>
            <div className={styles.tip}>
              搜索并选择要邀请的用户
            </div>
            <UserSearch
              onSelect={handleUserSelect}
              excludeUserIds={existingUserIds}
            />
          </>
        ) : (
          <InvitationForm
            selectedUser={selectedUser}
            virtualMembers={virtualMembers}
            onSubmit={handleInvitationSubmit}
            onCancel={() => setSelectedUser(null)}
            loading={submitLoading}
          />
        )}
      </div>
    </div>
  )
}

export default InviteMember