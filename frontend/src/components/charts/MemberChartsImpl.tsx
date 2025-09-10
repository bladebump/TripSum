import React from 'react'
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip 
} from 'recharts'
import { formatCurrency } from '@/utils/format'

interface CategoryPieChartProps {
  data: Array<{ name: string; value: number }>
  colors: string[]
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ data, colors }) => {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={70}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
      </PieChart>
    </ResponsiveContainer>
  )
}

interface BalanceBarChartProps {
  data: Array<{ name: string; contribution: number; paid: number; share: number }>
}

export const BalanceBarChart: React.FC<BalanceBarChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Bar dataKey="contribution" fill="#82CA9D" name="基金缴纳" />
        <Bar dataKey="paid" fill="#0088FE" name="实际垫付" />
        <Bar dataKey="share" fill="#00C49F" name="应该分摊" />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default {
  CategoryPieChart,
  BalanceBarChart
}