import React from 'react'
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Dot 
} from 'recharts'
import { formatCurrency } from '@/utils/format'

interface TrendLineChartProps {
  data: Array<{
    date: string
    amount: number
    count?: number
    [key: string]: any
  }>
  height?: number
  type?: 'line' | 'area'
  color?: string
  showGrid?: boolean
  showDots?: boolean
  smooth?: boolean
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload[0]) {
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
        <p style={{ margin: '4px 0 0 0', color: '#1890ff' }}>
          金额：{formatCurrency(payload[0].value)}
        </p>
        {payload[0].payload.count !== undefined && (
          <p style={{ margin: '4px 0 0 0', color: '#999', fontSize: '12px' }}>
            笔数：{payload[0].payload.count}
          </p>
        )}
      </div>
    )
  }
  return null
}

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props
  
  if (payload.isHighlight) {
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={6} 
        fill="#f5222d"
        stroke="#fff"
        strokeWidth={2}
      />
    )
  }
  
  return <Dot {...props} r={3} />
}

const TrendLineChart: React.FC<TrendLineChartProps> = ({
  data,
  height = 250,
  type = 'area',
  color = '#1890ff',
  showGrid = true,
  showDots = true,
  smooth = true
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
    date: item.date.split('-').slice(1).join('/'),
    isHighlight: item.amount > (data.reduce((sum, d) => sum + d.amount, 0) / data.length * 1.5)
  }))

  const ChartComponent = type === 'area' ? AreaChart : LineChart

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ChartComponent data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        {showGrid && (
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#f0f0f0"
            vertical={false}
          />
        )}
        <XAxis 
          dataKey="date" 
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
        {type === 'area' ? (
          <Area
            type={smooth ? 'monotone' : 'linear'}
            dataKey="amount"
            stroke={color}
            fill={color}
            fillOpacity={0.3}
            strokeWidth={2}
            dot={showDots ? <CustomDot /> : false}
            activeDot={{ r: 6 }}
            animationDuration={800}
          />
        ) : (
          <Line
            type={smooth ? 'monotone' : 'linear'}
            dataKey="amount"
            stroke={color}
            strokeWidth={2}
            dot={showDots ? <CustomDot /> : false}
            activeDot={{ r: 6 }}
            animationDuration={800}
          />
        )}
      </ChartComponent>
    </ResponsiveContainer>
  )
}

export default TrendLineChart