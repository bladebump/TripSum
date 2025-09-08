import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  NavBar, 
  List, 
  Card,
  Avatar,
  Badge,
  Dialog,
  Toast
} from 'antd-mobile'
import {
  MessageOutline,
  TeamOutline,
  SetOutline,
  RightOutline,
  UnorderedListOutline
} from 'antd-mobile-icons'
import { useAuthStore } from '@/stores/auth.store'
import { useMessageStore } from '@/stores/message.store'
import './Profile.scss'

const Profile: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { unreadStats, pendingInvitationsCount, fetchUnreadStats, fetchInvitations } = useMessageStore()

  useEffect(() => {
    // 获取未读消息统计
    fetchUnreadStats()
    // 获取待处理邀请
    fetchInvitations({ status: 'PENDING' as any })
  }, [])

  const handleLogout = () => {
    Dialog.confirm({
      title: '退出登录',
      content: '确定要退出登录吗？',
      onConfirm: () => {
        logout()
        navigate('/login')
        Toast.show({
          icon: 'success',
          content: '已退出登录'
        })
      }
    })
  }

  const menuItems = [
    {
      key: 'messages',
      title: '消息中心',
      icon: <MessageOutline />,
      badge: unreadStats?.total || 0,
      onClick: () => navigate('/messages')
    },
    {
      key: 'invitations',
      title: '我的邀请',
      icon: <TeamOutline />,
      badge: pendingInvitationsCount || 0,
      onClick: () => navigate('/invitations')
    },
    {
      key: 'trips',
      title: '我的行程',
      icon: <UnorderedListOutline />,
      onClick: () => navigate('/trips')
    },
    {
      key: 'message-settings',
      title: '消息设置',
      icon: <SetOutline />,
      onClick: () => navigate('/settings/messages')
    }
  ]

  return (
    <div className="profile-page">
      <NavBar backArrow={false}>个人中心</NavBar>
      
      <div className="profile-content">
        {/* 用户信息卡片 */}
        <Card className="user-card">
          <div className="user-info">
            <Avatar 
              src={user?.avatarUrl || ''} 
              className="user-avatar"
              style={{ '--size': '64px' }}
              fallback={user?.username?.charAt(0)?.toUpperCase() || 'U'}
            />
            <div className="user-details">
              <div className="username">{user?.username}</div>
              <div className="email">{user?.email}</div>
            </div>
          </div>
        </Card>

        {/* 功能菜单 */}
        <Card className="menu-card">
          <List>
            {menuItems.map(item => (
              <List.Item
                key={item.key}
                prefix={item.icon}
                extra={
                  <div className="list-item-extra">
                    {item.badge && item.badge > 0 && (
                      <Badge content={item.badge} />
                    )}
                    <RightOutline />
                  </div>
                }
                onClick={item.onClick}
              >
                {item.title}
              </List.Item>
            ))}
          </List>
        </Card>

        {/* 退出登录 */}
        <Card className="logout-card">
          <List>
            <List.Item
              onClick={handleLogout}
              className="logout-item"
            >
              <div className="logout-text">退出登录</div>
            </List.Item>
          </List>
        </Card>
      </div>
    </div>
  )
}

export default Profile