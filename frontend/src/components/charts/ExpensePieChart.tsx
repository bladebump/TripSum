import React from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/utils/format'

interface ExpensePieChartProps {
  data: Array<{
    name: string
    value: number
    percentage?: number
  }>
  colors?: string[]
  height?: number
  showLegend?: boolean
  innerRadius?: number
}

const DEFAULT_COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#fa8c16', '#a0d911']

const RADIAN = Math.PI / 180
const renderCustomizedLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent
}: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  if (percent < 0.05) return null

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload[0]) {
    const data = payload[0].payload
    return (
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        border: '1px solid #f0f0f0'
      }}>
        <p style={{ margin: 0, fontWeight: 'bold', color: '#333' }}>
          {data.name}
        </p>
        <p style={{ margin: '4px 0 0 0', color: '#666' }}>
          金额：{formatCurrency(data.value)}
        </p>
        {data.percentage !== undefined && (
          <p style={{ margin: '4px 0 0 0', color: '#999', fontSize: '12px' }}>
            占比：{data.percentage.toFixed(1)}%
          </p>
        )}
      </div>
    )
  }
  return null
}

const ExpensePieChart: React.FC<ExpensePieChartProps> = ({
  data,
  colors = DEFAULT_COLORS,
  height = 300,
  showLegend = true,
  innerRadius = 0
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

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={80}
          innerRadius={innerRadius}
          fill="#8884d8"
          dataKey="value"
          animationBegin={0}
          animationDuration={800}
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        {showLegend && (
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value) => <span style={{ color: '#666', fontSize: 12 }}>{value}</span>}
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  )
}

export default ExpensePieChart