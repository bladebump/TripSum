import React, { lazy, Suspense } from 'react'
import { SpinLoading } from 'antd-mobile'

const ExpensePieChart = lazy(() => import('./ExpensePieChart'))

interface LazyExpensePieChartProps {
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

const ChartLoading: React.FC<{ height: number }> = ({ height }) => (
  <div style={{
    height,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column'
  }}>
    <SpinLoading style={{ '--size': '32px' }} />
    <div style={{ marginTop: '8px', color: '#999', fontSize: '12px' }}>加载图表...</div>
  </div>
)

const LazyExpensePieChart: React.FC<LazyExpensePieChartProps> = (props) => {
  return (
    <Suspense fallback={<ChartLoading height={props.height || 300} />}>
      <ExpensePieChart {...props} />
    </Suspense>
  )
}

export default LazyExpensePieChart