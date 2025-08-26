import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Form, Input, Button, Toast, NavBar } from 'antd-mobile'
import { useAuthStore } from '@/stores/auth.store'
import { validateEmail, validatePassword, validateUsername } from '@/utils/validation'
import './Register.scss'

const Register: React.FC = () => {
  const navigate = useNavigate()
  const { register } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: any) => {
    const usernameValidation = validateUsername(values.username)
    if (!usernameValidation.valid) {
      Toast.show(usernameValidation.message!)
      return
    }

    if (!validateEmail(values.email)) {
      Toast.show('请输入正确的邮箱格式')
      return
    }

    const passwordValidation = validatePassword(values.password)
    if (!passwordValidation.valid) {
      Toast.show(passwordValidation.message!)
      return
    }

    if (values.password !== values.confirmPassword) {
      Toast.show('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      await register(values.username, values.email, values.password)
      Toast.show({
        icon: 'success',
        content: '注册成功',
      })
      navigate('/trips')
    } catch (error: any) {
      Toast.show({
        icon: 'fail',
        content: error.message || '注册失败',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-page">
      <NavBar onBack={() => navigate('/login')}>注册</NavBar>
      
      <div className="register-content">
        <div className="register-header">
          <h1>创建账号</h1>
          <p>加入TripSum，开始记录旅行</p>
        </div>

        <Form
          layout="horizontal"
          onFinish={onFinish}
          footer={
            <Button block type="submit" color="primary" size="large" loading={loading}>
              注册
            </Button>
          }
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" clearable />
          </Form.Item>

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
            <Input placeholder="请输入密码（至少6位）" type="password" clearable />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认密码"
            rules={[{ required: true, message: '请再次输入密码' }]}
          >
            <Input placeholder="请再次输入密码" type="password" clearable />
          </Form.Item>
        </Form>

        <div className="register-footer">
          <p>
            已有账号？
            <Link to="/login">立即登录</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register