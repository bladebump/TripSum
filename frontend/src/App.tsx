import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd-mobile'
import zhCN from 'antd-mobile/es/locales/zh-CN'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import TripList from './pages/TripList'
import TripDetail from './pages/TripDetail'
import ExpenseForm from './pages/ExpenseForm'
import MemberDashboard from './pages/MemberDashboard'
import Settlement from './pages/Settlement'
import Layout from './components/common/Layout'
import PrivateRoute from './components/common/PrivateRoute'
import ErrorBoundary from './components/common/ErrorBoundary'
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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Router>
      </ConfigProvider>
    </ErrorBoundary>
  )
}

export default App