import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  NavBar,
  Tabs,
  Input,
  Button,
  Tag,
  Toast,
  Space,
  Divider,
  Steps
} from 'antd-mobile'
import { AddOutline, DeleteOutline } from 'antd-mobile-icons'
import { useTripStore } from '@/stores/trip.store'
import { useAuthStore } from '@/stores/auth.store'
import aiService from '@/services/ai.service'
import invitationService from '@/services/invitation.service'
import UserSearch from '@/components/invitation/UserSearch'
import InvitationForm from '@/components/invitation/InvitationForm'
import { UserSearchResult, CreateInvitationDTO } from '@/types/invitation.types'
import { TripMember } from '@/types/trip.types'
import { isCurrentUserAdmin } from '@/utils/member'
import Loading from '@/components/common/Loading'
import './AddMember.scss'

const AddMember: React.FC = () => {
  const { id: tripId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentTrip, members, fetchTripDetail } = useTripStore()
  const { user } = useAuthStore()
  
  const [activeTab, setActiveTab] = useState('virtual')
  const [manualMembers, setManualMembers] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)
  
  // 邀请用户相关状态
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [virtualMembers, setVirtualMembers] = useState<TripMember[]>([])
  const [existingUserIds, setExistingUserIds] = useState<string[]>([])
  const [submitLoading, setSubmitLoading] = useState(false)

  useEffect(() => {
    if (tripId && !currentTrip) {
      // 使用 fetchTripDetail 替代，它会同时获取成员信息
      fetchTripDetail(tripId)
    }
  }, [tripId, currentTrip, fetchTripDetail])

  // 处理成员数据（用于邀请功能）
  useEffect(() => {
    if (members) {
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
  }, [members, user])

  const isAdmin = isCurrentUserAdmin(members, user?.id)

  if (!isAdmin) {
    return (
      <div className="add-member-page">
        <NavBar onBack={() => navigate(`/trips/${tripId}`)}>
          添加成员
        </NavBar>
        <div className="no-permission">
          <p>只有管理员可以添加成员</p>
        </div>
      </div>
    )
  }

  // 虚拟成员相关方法
  const addManualMember = () => {
    setManualMembers([...manualMembers, ''])
  }

  const removeManualMember = (index: number) => {
    if (manualMembers.length > 1) {
      setManualMembers(manualMembers.filter((_, i) => i !== index))
    }
  }

  const updateManualMember = (index: number, value: string) => {
    const updated = [...manualMembers]
    updated[index] = value
    setManualMembers(updated)
  }

  const handleManualAdd = async () => {
    const validMembers = manualMembers.filter(name => name.trim().length > 0)
    
    if (validMembers.length === 0) {
      Toast.show('请至少输入一个成员姓名')
      return
    }

    await addMembers(validMembers)
  }

  const addMembers = async (memberNames: string[]) => {
    setLoading(true)
    try {
      const result = await aiService.addMembers(tripId!, memberNames)
      
      if (result.success) {
        let message = `成功添加 ${result.added.length} 个虚拟成员`
        
        if (result.failed.length > 0) {
          message += `，${result.failed.length} 个失败`
        }
        
        if (result.validation.duplicates.length > 0) {
          message += `，${result.validation.duplicates.length} 个重复`
        }
        
        Toast.show(message)
        
        // 刷新行程和成员数据
        await fetchTripDetail(tripId!)
        
        // 清空输入
        setManualMembers([''])
        
        // 如果全部成功，返回上一页
        if (result.failed.length === 0 && result.validation.duplicates.length === 0) {
          setTimeout(() => {
            navigate(`/trips/${tripId}`)
          }, 1000)
        }
      } else {
        Toast.show('添加失败')
      }
    } catch (error) {
      Toast.show('添加虚拟成员失败')
    } finally {
      setLoading(false)
    }
  }

  // 邀请用户相关方法
  const handleUserSelect = (user: UserSearchResult) => {
    setSelectedUser(user)
  }

  const handleInvitationSubmit = async (invitation: CreateInvitationDTO) => {
    if (!tripId) return

    setSubmitLoading(true)
    try {
      await invitationService.sendInvitation(tripId, invitation)
      
      Toast.show({
        content: '邀请已发送',
        icon: 'success'
      })
      
      // 清空选中的用户
      setSelectedUser(null)
      
      // 返回上一页
      setTimeout(() => {
        navigate(`/trips/${tripId}`)
      }, 1000)
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

  if (!currentTrip) {
    return <Loading text="加载中..." />
  }

  return (
    <div className="add-member-page">
      <NavBar onBack={() => navigate(`/trips/${tripId}`)}>
        添加成员
      </NavBar>

      <div className="current-members">
        <div className="section-title">当前成员 ({members.length})</div>
        <div className="member-tags">
          {members.map(member => (
            <Tag key={member.id} color="primary">
              {member.isVirtual ? (member.displayName || '虚拟成员') : (member.user?.username || '未知用户')}
              {member.role === 'admin' && ' (管理员)'}
            </Tag>
          ))}
        </div>
      </div>

      <Divider />

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.Tab title="虚拟成员" key="virtual">
          <div className="tab-content">
            <div className="section-title">添加虚拟成员</div>
            <p className="section-desc">
              虚拟成员用于记录未注册用户的费用，如朋友、家人等
            </p>
            
            {manualMembers.map((member, index) => (
              <div key={index} className="member-input-row">
                <Input
                  placeholder={`成员 ${index + 1} 的姓名`}
                  value={member}
                  onChange={(value) => updateManualMember(index, value)}
                />
                {manualMembers.length > 1 && (
                  <Button
                    color="danger"
                    size="small"
                    onClick={() => removeManualMember(index)}
                  >
                    <DeleteOutline />
                  </Button>
                )}
              </div>
            ))}

            <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
              <Button 
                color="primary" 
                fill="outline" 
                onClick={addManualMember}
                block
              >
                <AddOutline /> 添加更多成员
              </Button>
              
              <Button
                color="primary"
                onClick={handleManualAdd}
                loading={loading}
                block
              >
                确认添加虚拟成员
              </Button>
            </Space>
          </div>
        </Tabs.Tab>

        <Tabs.Tab title="邀请用户" key="invite">
          <div className="tab-content">
            {!selectedUser ? (
              <>
                <div className="section-title">搜索并邀请用户</div>
                <p className="section-desc">
                  邀请已注册的用户加入行程，他们将收到邀请通知
                </p>
                
                <UserSearch
                  onSelect={handleUserSelect}
                  excludeUserIds={existingUserIds}
                />
              </>
            ) : (
              <>
                {/* 步骤指示器 */}
                <div style={{ marginBottom: 20 }}>
                  <Steps
                    current={1}
                    direction='horizontal'
                  >
                    <Steps.Step title='搜索用户' />
                    <Steps.Step title='发送邀请' />
                  </Steps>
                </div>

                <InvitationForm
                  selectedUser={selectedUser}
                  virtualMembers={virtualMembers}
                  onSubmit={handleInvitationSubmit}
                  onCancel={() => setSelectedUser(null)}
                  loading={submitLoading}
                />
              </>
            )}
          </div>
        </Tabs.Tab>
      </Tabs>
    </div>
  )
}

export default AddMember