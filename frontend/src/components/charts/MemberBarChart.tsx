import React from 'react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell, LabelList 
} from 'recharts'
import { formatCurrency } from '@/utils/format'

interface MemberBarChartProps {
  data: Array<{
    name: string
    contribution?: number
    paid?: number
    share?: number
    balance?: number
    [key: string]: any
  }>
  height?: number
  type?: 'single' | 'grouped' | 'stacked'
  colors?: { [key: string]: string }
  showLabel?: boolean
}

const DEFAULT_COLORS = {
  contribution: '#52c41a',
  paid: '#1890ff',
  share: '#faad14',
  balance: '#722ed1'
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length > 0) {
    return (
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        border: '1px solid #f0f0f0'
      }}>
        <p style={{ margin: 0, fontWeight: 'bold', color: '#333' }}>
          {label}
        </p>
        {payload.map((item: any, index: number) => (
          <p key={index} style={{ margin: '4px 0 0 0', color: item.color }}>
            {item.name === 'contribution' && '缴纳：'}
            {item.name === 'paid' && '垫付：'}
            {item.name === 'share' && '分摊：'}
            {item.name === 'balance' && '余额：'}
            {formatCurrency(item.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

const renderCustomBarLabel = (props: any) => {
  const { x, y, width, height, value } = props
  
  if (!value || Math.abs(value) < 10) return null
  
  return (
    <text
      x={x + width / 2}
      y={value > 0 ? y - 5 : y + height + 15}
      fill={value > 0 ? '#52c41a' : '#f5222d'}
      textAnchor="middle"
      fontSize={10}
      fontWeight="bold"
    >
      {value > 0 ? '+' : ''}{formatCurrency(value)}
    </text>
  )
}

const MemberBarChart: React.FC<MemberBarChartProps> = ({
  data,
  height = 300,
  type = 'grouped',
  colors = DEFAULT_COLORS,
  showLabel = false
}) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ 
        height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#999'
      }}>
        暂无数据
      </div>
    )
  }

  const chartData = data.map(item => ({
    ...item,
    name: item.name.length > 6 ? item.name.substring(0, 6) + '...' : item.name
  }))

  if (type === 'single' && chartData[0].balance !== undefined) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#999"
            fontSize={12}
            tickLine={false}
          />
          <YAxis 
            stroke="#999"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `¥${value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="balance" animationDuration={800}>
            <LabelList 
              dataKey="balance" 
              content={renderCustomBarLabel}
            />
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={(entry.balance ?? 0) > 0 ? '#52c41a' : (entry.balance ?? 0) < 0 ? '#f5222d' : '#999'} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis 
          dataKey="name" 
          stroke="#999"
          fontSize={12}
          tickLine={false}
        />
        <YAxis 
          stroke="#999"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `¥${value}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          formatter={(value: string) => {
            const labels: { [key: string]: string } = {
              contribution: '缴纳',
              paid: '垫付',
              share: '分摊',
              balance: '余额'
            }
            return labels[value] || value
          }}
        />
        {chartData[0].contribution !== undefined && (
          <Bar 
            dataKey="contribution" 
            fill={colors.contribution}
            stackId={type === 'stacked' ? 'stack' : undefined}
            animationDuration={800}
          >
            {showLabel && <LabelList dataKey="contribution" position="top" />}
          </Bar>
        )}
        {chartData[0].paid !== undefined && (
          <Bar 
            dataKey="paid" 
            fill={colors.paid}
            stackId={type === 'stacked' ? 'stack' : undefined}
            animationDuration={800}
          >
            {showLabel && <LabelList dataKey="paid" position="top" />}
          </Bar>
        )}
        {chartData[0].share !== undefined && (
          <Bar 
            dataKey="share" 
            fill={colors.share}
            stackId={type === 'stacked' ? 'stack' : undefined}
            animationDuration={800}
          >
            {showLabel && <LabelList dataKey="share" position="top" />}
          </Bar>
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}

export default MemberBarChart