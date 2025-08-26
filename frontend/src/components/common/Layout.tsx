import React from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { TabBar } from 'antd-mobile'
import {
  AppOutline,
  UserOutline,
  AddCircleOutline,
  UnorderedListOutline,
} from 'antd-mobile-icons'

const Layout: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  
  const tabs = [
    {
      key: '/trips',
      title: '行程',
      icon: <UnorderedListOutline />,
    },
    {
      key: '/add',
      title: '记账',
      icon: <AddCircleOutline />,
    },
    {
      key: '/dashboard',
      title: '统计',
      icon: <AppOutline />,
    },
    {
      key: '/profile',
      title: '我的',
      icon: <UserOutline />,
    },
  ]

  const shouldShowTabBar = () => {
    const hiddenPaths = ['/login', '/register', '/']
    return !hiddenPaths.includes(location.pathname)
  }

  return (
    <div className="app-layout">
      <div className="app-content">
        <Outlet />
      </div>
      {shouldShowTabBar() && (
        <TabBar
          activeKey={location.pathname}
          onChange={(key) => navigate(key)}
          className="app-tabbar"
        >
          {tabs.map((item) => (
            <TabBar.Item key={item.key} icon={item.icon} title={item.title} />
          ))}
        </TabBar>
      )}
    </div>
  )
}

export default Layout