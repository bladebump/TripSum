import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  NavBar, 
  Card,
  Button,
  List,
  Tag,
  Toast,
  Dialog,
  Steps,
  NoticeBar,
  Skeleton
} from 'antd-mobile'
import { 
  CheckCircleFill,
  ExclamationCircleFill,
  ClockCircleFill,
  DownlandOutline
} from 'antd-mobile-icons'
import tripService from '@/services/trip.service'
import { formatDateTime } from '@/utils/format'
import './TripSummary.scss'

interface TripSummaryData {
  summary: string
  insights: ConsumptionInsight[]
  recommendations: string[]
  highlights: TripHighlight[]
  warnings: string[]
  nextTripAdvice: string[]
  generatedAt: string
}

interface ConsumptionInsight {
  type: 'pattern' | 'anomaly' | 'trend' | 'comparison'
  title: string
  description: string
  severity?: 'info' | 'warning' | 'critical'
}

interface TripHighlight {
  type: 'achievement' | 'milestone' | 'memory'
  title: string
  description: string
  emoji?: string
}

const TripSummary: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [summaryData, setSummaryData] = useState<TripSummaryData | null>(null)
  const [exportLoading, setExportLoading] = useState(false)

  useEffect(() => {
    if (id) {
      loadOrGenerateSummary()
    }
  }, [id])

  const loadOrGenerateSummary = async () => {
    try {
      setLoading(true)
      // 尝试获取已有的总结
      const data = await tripService.getTripSummary(id!)
      setSummaryData(data)
    } catch (error) {
      // 如果没有总结，则生成新的
      generateSummary()
    } finally {
      setLoading(false)
    }
  }

  const generateSummary = async () => {
    try {
      setGenerating(true)
      const data = await tripService.generateTripSummary(id!)
      setSummaryData(data)
      Toast.show('AI分析完成')
    } catch (error) {
      Toast.show('生成总结失败，请稍后重试')
    } finally {
      setGenerating(false)
    }
  }

  const handleExport = async (format: 'html' | 'pdf' = 'html') => {
    try {
      setExportLoading(true)
      const blob = await tripService.exportTripSummary(id!, format)
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `trip-summary-${id}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      Toast.show('导出成功')
    } catch (error) {
      Toast.show('导出失败')
    } finally {
      setExportLoading(false)
    }
  }

  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <ExclamationCircleFill color="#f5222d" />
      case 'warning':
      case 'medium':
        return <ExclamationCircleFill color="#faad14" />
      default:
        return <CheckCircleFill color="#52c41a" />
    }
  }

  const getInsightTypeLabel = (type: string) => {
    const labels: Record<string, { text: string; color: string }> = {
      pattern: { text: '消费模式', color: 'primary' },
      anomaly: { text: '异常发现', color: 'danger' },
      trend: { text: '趋势分析', color: 'warning' },
      comparison: { text: '对比分析', color: 'success' }
    }
    return labels[type] || { text: '分析', color: 'default' }
  }

  if (loading || generating) {
    return (
      <div className="trip-summary">
        <NavBar onBack={() => navigate(`/trips/${id}`)}>
          AI行程复盘
        </NavBar>
        <div className="loading-container">
          {generating ? (
            <>
              <div className="generating-animation">
                <ClockCircleFill fontSize={48} color="#1890ff" />
              </div>
              <div className="generating-text">AI正在分析您的行程数据...</div>
              <Steps current={1} direction="vertical" style={{ marginTop: 24 }}>
                <Steps.Step title="收集行程数据" description="获取支出、成员、统计信息" />
                <Steps.Step title="深度分析" description="识别消费模式和异常" status="process" />
                <Steps.Step title="生成报告" description="创建个性化建议" status="wait" />
              </Steps>
            </>
          ) : (
            <Skeleton.Title animated />
          )}
        </div>
      </div>
    )
  }

  if (!summaryData) {
    return (
      <div className="trip-summary">
        <NavBar onBack={() => navigate(`/trips/${id}`)}>
          AI行程复盘
        </NavBar>
        <div className="empty-container">
          <div className="empty-icon">📊</div>
          <div className="empty-text">暂无复盘数据</div>
          <Button color="primary" onClick={generateSummary}>
            生成AI复盘
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="trip-summary">
      <NavBar 
        onBack={() => navigate(`/trips/${id}`)}
        right={
          <Button 
            size="small" 
            loading={exportLoading}
            onClick={() => handleExport('html')}
          >
            <DownlandOutline /> 导出
          </Button>
        }
      >
        AI行程复盘
      </NavBar>

      {/* 生成时间 */}
      <div className="generation-time">
        生成于 {formatDateTime(summaryData.generatedAt)}
      </div>

      {/* 总体总结 */}
      <Card className="summary-card">
        <div className="summary-title">📊 总体概况</div>
        <div className="summary-content">{summaryData.summary}</div>
      </Card>

      {/* 行程亮点 */}
      {summaryData.highlights.length > 0 && (
        <Card className="highlights-card">
          <div className="card-title">✨ 行程亮点</div>
          <div className="highlights-grid">
            {summaryData.highlights.map((highlight, index) => (
              <div key={index} className="highlight-item">
                <div className="highlight-emoji">{highlight.emoji || '🌟'}</div>
                <div className="highlight-title">{highlight.title}</div>
                <div className="highlight-desc">{highlight.description}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 消费洞察 */}
      {summaryData.insights.length > 0 && (
        <Card className="insights-card">
          <div className="card-title">🔍 消费洞察</div>
          <List>
            {summaryData.insights.map((insight, index) => {
              const typeLabel = getInsightTypeLabel(insight.type)
              return (
                <List.Item
                  key={index}
                  prefix={getSeverityIcon(insight.severity)}
                  description={insight.description}
                  extra={
                    <Tag color={typeLabel.color as any}>
                      {typeLabel.text}
                    </Tag>
                  }
                >
                  {insight.title}
                </List.Item>
              )
            })}
          </List>
        </Card>
      )}

      {/* 警告提醒 */}
      {summaryData.warnings.length > 0 && (
        <NoticeBar 
          content={summaryData.warnings[0]} 
          color="alert"
          wrap
        />
      )}

      {/* 优化建议 */}
      {summaryData.recommendations.length > 0 && (
        <Card className="recommendations-card">
          <div className="card-title">💡 优化建议</div>
          <div className="recommendations-list">
            {summaryData.recommendations.map((rec, index) => (
              <div key={index} className="recommendation-item">
                <div className="rec-number">{index + 1}</div>
                <div className="rec-content">{rec}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 下次旅行建议 */}
      {summaryData.nextTripAdvice.length > 0 && (
        <Card className="advice-card">
          <div className="card-title">🚀 下次旅行建议</div>
          <List>
            {summaryData.nextTripAdvice.map((advice, index) => (
              <List.Item key={index} prefix="•">
                {advice}
              </List.Item>
            ))}
          </List>
        </Card>
      )}

      {/* 操作按钮 */}
      <div className="action-buttons">
        <Button 
          block 
          color="primary" 
          size="large"
          onClick={() => {
            Dialog.confirm({
              content: '是否重新生成AI分析报告？',
              onConfirm: async () => {
                await generateSummary()
              }
            })
          }}
        >
          重新分析
        </Button>
        <Button 
          block 
          size="large"
          onClick={() => navigate(`/trips/${id}/statistics`)}
          style={{ marginTop: 12 }}
        >
          查看详细统计
        </Button>
      </div>
    </div>
  )
}

export default TripSummary