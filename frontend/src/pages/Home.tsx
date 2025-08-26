import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from 'antd-mobile'
import { useAuthStore } from '@/stores/auth.store'
import './Home.scss'

const Home: React.FC = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/trips')
    }
  }, [isAuthenticated, navigate])

  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="logo">
          <h1>TripSum</h1>
          <p>旅算</p>
        </div>
        <h2>让旅行费用分摊变得简单</h2>
        <p className="subtitle">专为小团体旅行设计的智能记账应用</p>
      </div>

      <div className="features">
        <div className="feature-item">
          <div className="feature-icon">💰</div>
          <h3>智能记账</h3>
          <p>快速记录消费，支持多种分摊方式</p>
        </div>
        <div className="feature-item">
          <div className="feature-icon">🤖</div>
          <h3>AI辅助</h3>
          <p>自然语言解析，智能分类归属</p>
        </div>
        <div className="feature-item">
          <div className="feature-icon">📊</div>
          <h3>实时计算</h3>
          <p>自动计算余额，清晰展示债务关系</p>
        </div>
        <div className="feature-item">
          <div className="feature-icon">👥</div>
          <h3>团队协作</h3>
          <p>多人实时同步，共同管理账本</p>
        </div>
      </div>

      <div className="action-buttons">
        <Button 
          block 
          color="primary" 
          size="large"
          onClick={() => navigate('/register')}
        >
          立即开始
        </Button>
        <Button 
          block 
          size="large"
          fill="none"
          onClick={() => navigate('/login')}
        >
          我已有账号
        </Button>
      </div>
    </div>
  )
}

export default Home