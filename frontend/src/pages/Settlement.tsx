import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NavBar, Card, List, Button, Toast, Steps, Dialog } from 'antd-mobile'
import { CheckCircleFill, RightOutline } from 'antd-mobile-icons'
import { useExpenseStore } from '@/stores/expense.store'
import { formatCurrency } from '@/utils/format'
import Loading from '@/components/common/Loading'
import './Settlement.scss'

const Settlement: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { settlementSummary, calculateSettlement, createSettlements } = useExpenseStore()
  const [loading, setLoading] = useState(false)
  const [settling, setSettling] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (id) {
      loadSettlement()
    }
  }, [id])

  const loadSettlement = async () => {
    try {
      setLoading(true)
      await calculateSettlement(id!)
    } catch (error) {
      Toast.show('计算失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSettle = async () => {
    Dialog.confirm({
      title: '确认结算',
      content: '确认按照当前方案进行结算吗？结算后将生成结算记录。',
      onConfirm: async () => {
        if (!settlementSummary) return
        
        try {
          setSettling(true)
          const settlements = settlementSummary.settlements.map(s => ({
            fromUserId: s.from.userId,
            toUserId: s.to.userId,
            amount: s.amount
          }))
          await createSettlements(id!, settlements)
          Toast.show({
            icon: 'success',
            content: '结算成功'
          })
          setCurrentStep(2)
        } catch (error) {
          Toast.show('结算失败')
        } finally {
          setSettling(false)
        }
      }
    })
  }

  if (loading) {
    return <Loading text="计算中..." />
  }

  if (!settlementSummary) {
    return null
  }

  const steps = [
    { title: '查看方案', description: '确认结算方案' },
    { title: '执行转账', description: '按方案转账' },
    { title: '完成结算', description: '结算成功' }
  ]

  return (
    <div className="settlement-page">
      <NavBar onBack={() => navigate(`/trips/${id}`)}>
        结算
      </NavBar>

      <div className="settlement-content">
        <Steps current={currentStep}>
          {steps.map((step, index) => (
            <Steps.Step 
              key={index} 
              title={step.title} 
              description={step.description}
            />
          ))}
        </Steps>

        <Card title="结算方案" className="settlement-card">
          <div className="settlement-summary">
            <div className="summary-item">
              <span>交易笔数</span>
              <strong>{settlementSummary.summary.totalTransactions}</strong>
            </div>
            <div className="summary-item">
              <span>结算总额</span>
              <strong>{formatCurrency(settlementSummary.summary.totalAmount)}</strong>
            </div>
          </div>
        </Card>

        {settlementSummary.settlements.length === 0 ? (
          <Card className="no-settlement">
            <div className="success-icon">
              <CheckCircleFill fontSize={48} color="#52c41a" />
            </div>
            <h3>已结清</h3>
            <p>当前没有需要结算的债务</p>
          </Card>
        ) : (
          <>
            <Card title="转账详情" className="transfer-card">
              <List>
                {settlementSummary.settlements.map((settlement, index) => (
                  <List.Item
                    key={index}
                    arrow={<RightOutline />}
                    description={`需要转账 ${formatCurrency(settlement.amount)}`}
                  >
                    <div className="transfer-item">
                      <span className="from">{settlement.from.username}</span>
                      <span className="arrow">→</span>
                      <span className="to">{settlement.to.username}</span>
                    </div>
                  </List.Item>
                ))}
              </List>
            </Card>

            <div className="settlement-tips">
              <h4>结算说明</h4>
              <ol>
                <li>请按照上述方案进行转账</li>
                <li>建议使用微信或支付宝转账并保留截图</li>
                <li>所有转账完成后点击"确认结算"</li>
                <li>结算完成后，所有债务关系将清零</li>
              </ol>
            </div>

            {currentStep < 2 && (
              <div className="settlement-actions">
                <Button 
                  block 
                  color="primary" 
                  size="large"
                  loading={settling}
                  onClick={handleSettle}
                >
                  确认结算
                </Button>
              </div>
            )}
          </>
        )}

        {currentStep === 2 && (
          <Card className="success-card">
            <div className="success-icon">
              <CheckCircleFill fontSize={48} color="#52c41a" />
            </div>
            <h3>结算成功</h3>
            <p>所有债务已清零</p>
            <Button 
              color="primary" 
              onClick={() => navigate(`/trips/${id}`)}
            >
              返回行程
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}

export default Settlement