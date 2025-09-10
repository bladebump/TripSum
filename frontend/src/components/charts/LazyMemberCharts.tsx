import React, { lazy, Suspense } from 'react'
import { SpinLoading } from 'antd-mobile'

// 懒加载单独的图表组件
const CategoryPieChartImpl = lazy(() => 
  import('./MemberChartsImpl').then(module => ({ 
    default: module.CategoryPieChart 
  }))
)

const BalanceBarChartImpl = lazy(() => 
  import('./MemberChartsImpl').then(module => ({ 
    default: module.BalanceBarChart 
  }))
)

interface ChartLoadingProps {
  height: number
}

const ChartLoading: React.FC<ChartLoadingProps> = ({ height }) => (
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

interface CategoryPieChartProps {
  data: Array<{ name: string; value: number }>
  colors: string[]
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = (props) => {
  return (
    <Suspense fallback={<ChartLoading height={200} />}>
      <CategoryPieChartImpl {...props} />
    </Suspense>
  )
}

interface BalanceBarChartProps {
  data: Array<{ name: string; contribution: number; paid: number; share: number }>
}

export const BalanceBarChart: React.FC<BalanceBarChartProps> = (props) => {
  return (
    <Suspense fallback={<ChartLoading height={200} />}>
      <BalanceBarChartImpl {...props} />
    </Suspense>
  )
}