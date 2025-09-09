import OpenAI from 'openai'
import { PrismaClient } from '@prisma/client'
import { calculationService } from '../calculation.service'
import AmountUtil from '../../utils/decimal'
import { TripSummaryResult } from './types'
import { promptBuilder } from './prompt-builder'
import { insightService } from './insight.service'
import { highlightService } from './highlight.service'
import { reportGenerator } from './report-generator'

const prisma = new PrismaClient()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
})

export class AISummaryService {
  async generateTripSummary(tripId: string): Promise<TripSummaryResult> {
    try {
      // 获取行程完整数据
      const [trip, statistics, expenses] = await Promise.all([
        prisma.trip.findUnique({
          where: { id: tripId },
          include: {
            members: {
              where: { isActive: true },
              include: { user: true }
            },
            categories: true
          }
        }),
        calculationService.getTripStatistics(tripId),
        prisma.expense.findMany({
          where: { tripId },
          include: {
            category: true,
            payerMember: {
              include: { user: true }
            },
            participants: {
              include: {
                tripMember: {
                  include: { user: true }
                }
              }
            }
          },
          orderBy: { expenseDate: 'desc' }
        })
      ])

      if (!trip) {
        throw new Error('行程不存在')
      }

      // 准备分析数据
      const analysisData = this.prepareAnalysisData(trip, statistics, expenses)
      
      // 调用AI生成分析报告
      const aiAnalysis = await this.callAIForAnalysis(analysisData)
      
      // 生成消费洞察
      const insights = insightService.generateInsights(statistics, expenses)
      
      // 生成行程亮点
      const highlights = highlightService.generateHighlights(trip, statistics, expenses)
      
      // 生成警告和建议
      const warnings = insightService.generateWarnings(statistics)
      
      // 生成下次旅行建议
      const nextTripAdvice = insightService.generateNextTripAdvice(statistics, insights)

      return {
        summary: aiAnalysis.summary,
        insights,
        recommendations: aiAnalysis.recommendations || [],
        highlights,
        warnings,
        nextTripAdvice,
        generatedAt: new Date()
      }
    } catch (error) {
      console.error('生成行程总结失败:', error)
      throw error
    }
  }

  private prepareAnalysisData(trip: any, statistics: any, expenses: any[]) {
    const startDate = new Date(trip.startDate)
    const endDate = trip.endDate ? new Date(trip.endDate) : new Date()
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    return {
      tripName: trip.name,
      description: trip.description,
      duration,
      memberCount: trip.members.length,
      members: trip.members.map((m: any) => ({
        name: m.isVirtual ? m.displayName : m.user?.username,
        role: m.role,
        contribution: m.contribution
      })),
      totalExpenses: statistics.totalExpenses,
      expenseCount: statistics.expenseCount,
      averagePerPerson: statistics.averagePerPerson,
      averagePerDay: statistics.advancedMetrics?.dailyAverage || 0,
      categoryBreakdown: statistics.categoryBreakdown,
      peakDay: statistics.advancedMetrics?.peakDay,
      trend: statistics.advancedMetrics?.trend,
      fundUtilization: statistics.fundStatus?.fundUtilization,
      paymentMethodDistribution: {
        fundPool: statistics.paymentMethodStats?.fundPool.percentage || 0,
        memberPaid: statistics.paymentMethodStats?.memberReimbursement.percentage || 0
      },
      timeDistribution: statistics.timeDistribution,
      topExpenses: expenses
        .filter(e => AmountUtil.greaterThan(e.amount, 0))
        .sort((a, b) => {
          const aAmount = AmountUtil.toDecimal(a.amount)
          const bAmount = AmountUtil.toDecimal(b.amount)
          return bAmount.minus(aAmount).toNumber()
        })
        .slice(0, 5)
        .map(e => ({
          description: e.description,
          amount: AmountUtil.toNumber(AmountUtil.toDecimal(e.amount)),
          category: e.category?.name,
          date: e.expenseDate
        })),
      anomalies: statistics.anomalies
    }
  }

  private async callAIForAnalysis(data: any): Promise<{ summary: string; recommendations: string[] }> {
    try {
      const prompt = promptBuilder.buildAnalysisPrompt(data)
      const systemPrompt = promptBuilder.getSystemPrompt()

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 1000
      })

      const result = JSON.parse(completion.choices[0].message.content || '{}')
      
      return {
        summary: result.summary || '暂无分析结果',
        recommendations: result.recommendations || []
      }
    } catch (error) {
      console.error('AI分析失败:', error)
      return {
        summary: '自动分析暂时不可用，请稍后重试。',
        recommendations: []
      }
    }
  }

  async exportSummaryReport(tripId: string): Promise<Buffer> {
    try {
      const summary = await this.generateTripSummary(tripId)
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: {
          members: {
            where: { isActive: true },
            include: { user: true }
          }
        }
      })

      if (!trip) {
        throw new Error('行程不存在')
      }

      // 生成HTML报告
      const htmlContent = reportGenerator.generateHTMLReport(trip, summary)
      return Buffer.from(htmlContent, 'utf-8')
    } catch (error) {
      console.error('导出报告失败:', error)
      throw error
    }
  }
}

export const aiSummaryService = new AISummaryService()