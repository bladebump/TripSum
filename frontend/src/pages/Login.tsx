import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Form, Input, Button, Toast, NavBar } from 'antd-mobile'
import { useAuthStore } from '@/stores/auth.store'
import { validateEmail } from '@/utils/validation'
import './Login.scss'

const Login: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: any) => {
    if (!validateEmail(values.email)) {
      Toast.show('请输入正确的邮箱格式')
      return
    }

    setLoading(true)
    try {
      await login(values.email, values.password)
      Toast.show({
        icon: 'success',
        content: '登录成功',
      })
      navigate('/trips')
    } catch (error: any) {
      Toast.show({
        icon: 'fail',
        content: error.message || '登录失败',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <NavBar onBack={() => navigate('/')}>登录</NavBar>
      
      <div className="login-content">
        <div className="login-header">
          <h1>欢迎回来</h1>
          <p>登录您的TripSum账号</p>
        </div>

        <Form
          layout="horizontal"
          onFinish={onFinish}
          footer={
            <Button block type="submit" color="primary" size="large" loading={loading}>
              登录
            </Button>
          }
        >
          <Form.Item
            name="email"
            label="邮箱"
            rules={[{ required: true, message: '请输入邮箱' }]}
          >
            <Input placeholder="请输入邮箱" type="email" clearable />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input placeholder="请输入密码" type="password" clearable />
          </Form.Item>
        </Form>

        <div className="login-footer">
          <p>
            还没有账号？
            <Link to="/register">立即注册</Link>
          </p>
        </div>

        <div className="test-accounts">
          <p>测试账号：</p>
          <p>alice@example.com / password123</p>
          <p>bob@example.com / password123</p>
        </div>
      </div>
    </div>
  )
}

export default Login