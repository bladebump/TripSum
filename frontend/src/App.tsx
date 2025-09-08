import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd-mobile'
import zhCN from 'antd-mobile/es/locales/zh-CN'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import TripList from './pages/TripList'
import TripDetail from './pages/TripDetail'
import ExpenseForm from './pages/ExpenseForm'
import ChatExpense from './pages/ChatExpense'
import MemberDashboard from './pages/MemberDashboard'
import Settlement from './pages/Settlement'
import AddMember from './pages/AddMember'
import TripSummary from './pages/TripSummary'
import TripStatistics from './pages/TripStatistics'
import Profile from './pages/Profile'
import MessageCenter from './pages/MessageCenter'
import Layout from './components/common/Layout'
import PrivateRoute from './components/common/PrivateRoute'
import ErrorBoundary from './components/common/ErrorBoundary'
import './styles/design-tokens.scss' // 全局导入一次
import './App.scss'

function App() {
  return (
    <ErrorBoundary>
      <ConfigProvider locale={zhCN}>
        <Router>
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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Router>
      </ConfigProvider>
    </ErrorBoundary>
  )
}

export default App