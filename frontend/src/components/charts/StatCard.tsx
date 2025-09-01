import React from 'react'
import { Card } from 'antd-mobile'
import { formatCurrency } from '@/utils/format'
import './StatCard.scss'

interface StatCardProps {
  title: string
  value: number | string
  suffix?: string
  prefix?: string
  type?: 'currency' | 'number' | 'text'
  trend?: 'up' | 'down' | 'stable'
  trendValue?: string
  icon?: React.ReactNode
  color?: string
  onClick?: () => void
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  suffix,
  prefix,
  type = 'currency',
  trend,
  trendValue,
  icon,
  color = '#1890ff',
  onClick
}) => {
  const formatValue = () => {
    if (type === 'currency') {
      return formatCurrency(typeof value === 'string' ? parseFloat(value) : value)
    }
    return value
  }

  const getTrendIcon = () => {
    if (!trend) return null
    
    switch (trend) {
      case 'up':
        return (
          <span style={{ color: '#f5222d', fontSize: 12 }}>
            ↑ {trendValue}
          </span>
        )
      case 'down':
        return (
          <span style={{ color: '#52c41a', fontSize: 12 }}>
            ↓ {trendValue}
          </span>
        )
      case 'stable':
        return (
          <span style={{ color: '#999', fontSize: 12 }}>
            → 持平
          </span>
        )
      default:
        return null
    }
  }

  return (
    <Card 
      className="stat-card"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="stat-card-header">
        {icon && <div className="stat-card-icon" style={{ color }}>{icon}</div>}
        <div className="stat-card-title">{title}</div>
      </div>
      <div className="stat-card-content">
        <div className="stat-card-value" style={{ color }}>
          {prefix && <span className="stat-card-prefix">{prefix}</span>}
          <span className="stat-card-main-value">{formatValue()}</span>
          {suffix && <span className="stat-card-suffix">{suffix}</span>}
        </div>
        {trend && (
          <div className="stat-card-trend">
            {getTrendIcon()}
          </div>
        )}
      </div>
    </Card>
  )
}

export default StatCard