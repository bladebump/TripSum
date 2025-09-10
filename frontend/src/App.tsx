import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, Toast } from 'antd-mobile'
import zhCN from 'antd-mobile/es/locales/zh-CN'
import Layout from './components/common/Layout'
import PrivateRoute from './components/common/PrivateRoute'
import ErrorBoundary from './components/common/ErrorBoundary'
import PageLoading from './components/common/PageLoading'

// 懒加载页面组件
const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const TripList = lazy(() => import('./pages/TripList'))
const TripDetail = lazy(() => import('./pages/TripDetail'))
const ExpenseForm = lazy(() => import('./pages/ExpenseForm'))
const ChatExpense = lazy(() => import('./pages/ChatExpense'))
const MemberDashboard = lazy(() => import('./pages/MemberDashboard'))
const Settlement = lazy(() => import('./pages/Settlement'))
const AddMember = lazy(() => import('./pages/AddMember'))
const TripSummary = lazy(() => import('./pages/TripSummary'))
const TripStatistics = lazy(() => import('./pages/TripStatistics'))
const Profile = lazy(() => import('./pages/Profile'))
const MessageCenter = lazy(() => import('./pages/MessageCenter'))
const MessageDetail = lazy(() => import('./pages/MessageDetail'))
const MessagePreferences = lazy(() => import('./pages/MessagePreferences'))
const InviteMember = lazy(() => import('./pages/InviteMember'))
const InvitationList = lazy(() => import('./pages/InvitationList'))
import socketService from './services/socket.service'
import { useAuthStore } from './stores/auth.store'
import { useMessageStore } from './stores/message.store'
import './styles/design-tokens.scss' // 全局导入一次
import './App.scss'

function App() {
  const { user, isAuthenticated } = useAuthStore()
  const { 
    handleNewMessage, 
    handleMessageRead, 
    handleInvitationReceived,
    fetchUnreadStats 
  } = useMessageStore()

  // WebSocket连接初始化和事件监听
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      // 连接WebSocket
      socketService.connect(user.id)
      
      // 设置消息事件监听器
      socketService.on('new_message', (message) => {
        handleNewMessage(message)
        // 显示通知提示
        Toast.show({
          content: `您有新消息：${message.title}`,
          position: 'top',
          duration: 3000
        })
      })
      
      socketService.on('message_read', (messageId) => {
        handleMessageRead(messageId)
      })
      
      socketService.on('invitation_received', (invitation) => {
        handleInvitationReceived(invitation)
        // 显示邀请通知
        Toast.show({
          content: '您收到了新的行程邀请',
          position: 'top',
          duration: 3000
        })
      })
      
      socketService.on('invitation_accepted', () => {
        // 刷新未读统计
        fetchUnreadStats()
        Toast.show({
          content: '有用户接受了您的邀请',
          position: 'top',
          duration: 3000
        })
      })
      
      socketService.on('invitation_rejected', () => {
        // 刷新未读统计
        fetchUnreadStats()
      })

      // 获取初始未读统计
      fetchUnreadStats()
      
      // 清理函数
      return () => {
        socketService.off('new_message', handleNewMessage)
        socketService.off('message_read', handleMessageRead)
        socketService.off('invitation_received', handleInvitationReceived)
        socketService.disconnect()
      }
    } else {
      // 用户未登录或登出时断开连接
      socketService.disconnect()
    }
  }, [isAuthenticated, user?.id])

  // 断线重连处理
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated && user?.id) {
        // 页面重新可见时检查连接状态
        if (!socketService.isConnected()) {
          socketService.reconnect()
        }
      }
    }

    const handleOnline = () => {
      // 网络恢复时重连
      if (isAuthenticated && user?.id && !socketService.isConnected()) {
        socketService.reconnect()
      }
    }

    // 监听页面可见性变化和网络状态
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
    }
  }, [isAuthenticated, user?.id])

  return (
    <ErrorBoundary>
      <ConfigProvider locale={zhCN}>
        <Router>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route
                path="trips"
                element={
                  <PrivateRoute>
                    <TripList />
                  </PrivateRoute>
                }
              />
              <Route
                path="trips/:id"
                element={
                  <PrivateRoute>
                    <TripDetail />
                  </PrivateRoute>
                }
              />
              <Route
                path="trips/:id/expense/new"
                element={
                  <PrivateRoute>
                    <ChatExpense />
                  </PrivateRoute>
                }
              />
              <Route
                path="trips/:id/expense/form"
                element={
                  <PrivateRoute>
                    <ExpenseForm />
                  </PrivateRoute>
                }
              />
              <Route
                path="trips/:id/expense/:expenseId/edit"
                element={
                  <PrivateRoute>
                    <ExpenseForm />
                  </PrivateRoute>
                }
              />
              <Route
                path="trips/:id/dashboard"
                element={
                  <PrivateRoute>
                    <MemberDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="trips/:id/settlement"
                element={
                  <PrivateRoute>
                    <Settlement />
                  </PrivateRoute>
                }
              />
              <Route
                path="trips/:id/members/add"
                element={
                  <PrivateRoute>
                    <AddMember />
                  </PrivateRoute>
                }
              />
              <Route
                path="trips/:id/summary"
                element={
                  <PrivateRoute>
                    <TripSummary />
                  </PrivateRoute>
                }
              />
              <Route
                path="trips/:id/statistics"
                element={
                  <PrivateRoute>
                    <TripStatistics />
                  </PrivateRoute>
                }
              />
              <Route
                path="trips/:id/invite"
                element={
                  <PrivateRoute>
                    <InviteMember />
                  </PrivateRoute>
                }
              />
              <Route
                path="profile"
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                }
              />
              <Route
                path="messages"
                element={
                  <PrivateRoute>
                    <MessageCenter />
                  </PrivateRoute>
                }
              />
              <Route
                path="messages/:id"
                element={
                  <PrivateRoute>
                    <MessageDetail />
                  </PrivateRoute>
                }
              />
              <Route
                path="message-preferences"
                element={
                  <PrivateRoute>
                    <MessagePreferences />
                  </PrivateRoute>
                }
              />
              <Route
                path="invitations"
                element={
                  <PrivateRoute>
                    <InvitationList />
                  </PrivateRoute>
                }
              />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </ConfigProvider>
    </ErrorBoundary>
  )
}

export default App