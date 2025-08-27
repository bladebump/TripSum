import React, { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { TabBar, Toast } from 'antd-mobile'
import {
  AppOutline,
  UserOutline,
  AddCircleOutline,
  UnorderedListOutline,
} from 'antd-mobile-icons'
import { useAuthStore } from '@/stores/auth.store'
import { useTripStore } from '@/stores/trip.store'

const Layout: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuthStore()
  const { currentTrip, trips, fetchTrips } = useTripStore()
  const [hasTrip, setHasTrip] = useState(false)
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchTrips({ limit: 1 }).then(() => {
        // trips会在store中更新，不需要在这里设置
      }).catch(() => {
        console.error('Failed to fetch trips')
      })
    }
  }, [isAuthenticated])
  
  useEffect(() => {
    // 单独监听trips变化来更新hasTrip状态
    setHasTrip(trips.length > 0)
  }, [trips])
  
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
  
  const handleTabChange = (key: string) => {
    if (!isAuthenticated) {
      Toast.show('请先登录')
      navigate('/login')
      return
    }
    
    if ((key === '/add' || key === '/dashboard') && !hasTrip) {
      Toast.show('请先创建行程')
      navigate('/trips')
      return
    }
    
    if (key === '/add' && hasTrip && trips.length > 0) {
      navigate(`/trips/${trips[0].id}/expense/new`)
      return
    }
    
    if (key === '/dashboard' && hasTrip && trips.length > 0) {
      navigate(`/trips/${trips[0].id}/dashboard`)
      return
    }
    
    if (key === '/profile') {
      Toast.show('个人中心功能暂未开放')
      return
    }
    
    navigate(key)
  }

  return (
    <div className="app-layout">
      <div className="app-content">
        <Outlet />
      </div>
      {shouldShowTabBar() && (
        <TabBar
          activeKey={location.pathname}
          onChange={handleTabChange}
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