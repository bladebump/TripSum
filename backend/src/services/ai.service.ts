import OpenAI from 'openai'
import { PrismaClient } from '@prisma/client'
import { ExpenseParseResult } from '../types'

const prisma = new PrismaClient()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
})

export class AIService {
  async parseExpenseDescription(tripId: string, description: string): Promise<ExpenseParseResult> {
    try {
      const members = await prisma.tripMember.findMany({
        where: { tripId, isActive: true },
        include: { user: true },
      })

      const memberNames = members.map((m) => m.user.username).join(', ')

      const prompt = `
        你是一个智能账单解析助手。请分析以下消费描述，识别参与者和金额。
        
        团队成员：${memberNames}
        消费描述：${description}
        
        请返回JSON格式：
        {
          "amount": 金额（数字，如果没有明确金额返回null）,
          "participants": [
            {
              "username": "参与者名字",
              "shareAmount": 应分摊金额（如果平均分摊可以省略）
            }
          ],
          "category": "消费类别（餐饮/交通/住宿/娱乐/购物/其他）",
          "confidence": 置信度（0-1之间的数字）
        }
        
        注意：
        1. 如果描述中没有明确的参与者，返回空数组
        2. 如果无法确定金额，amount返回null
        3. 根据描述内容判断最合适的类别
      `

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的账单解析助手，擅长从自然语言中提取结构化信息。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      })

      const result = JSON.parse(completion.choices[0].message.content || '{}')

      if (result.participants && result.participants.length > 0) {
        for (const participant of result.participants) {
          const member = members.find(
            (m) => m.user.username.toLowerCase() === participant.username.toLowerCase()
          )
          if (member) {
            participant.userId = member.userId
          }
        }
      }

      return {
        amount: result.amount,
        participants: result.participants,
        category: result.category,
        confidence: result.confidence || 0.5,
      }
    } catch (error) {
      console.error('AI解析错误:', error)
      return {
        confidence: 0,
      }
    }
  }

  async categorizeExpense(description: string): Promise<{ category: string; confidence: number }> {
    try {
      const prompt = `
        分析以下消费描述，判断它属于哪个类别。
        
        类别选项：餐饮、交通、住宿、娱乐、购物、其他
        描述：${description}
        
        请返回JSON格式：
        {
          "category": "类别名称",
          "confidence": 置信度（0-1）
        }
      `

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: '你是一个消费分类专家。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      })

      const result = JSON.parse(completion.choices[0].message.content || '{}')

      return {
        category: result.category || '其他',
        confidence: result.confidence || 0.5,
      }
    } catch (error) {
      console.error('分类错误:', error)
      return {
        category: '其他',
        confidence: 0,
      }
    }
  }

  async suggestSplitMethod(
    tripId: string,
    amount: number,
    description: string
  ): Promise<{
    splitMethod: 'equal' | 'custom' | 'percentage'
    participants: Array<{
      userId: string
      username: string
      shareAmount?: number
      sharePercentage?: number
      reason?: string
    }>
  }> {
    try {
      const members = await prisma.tripMember.findMany({
        where: { tripId, isActive: true },
        include: { user: true },
      })

      const memberInfo = members
        .map((m) => `${m.user.username} (ID: ${m.userId})`)
        .join(', ')

      const prompt = `
        分析以下消费情况，建议如何分摊费用。
        
        团队成员：${memberInfo}
        总金额：${amount}元
        描述：${description}
        
        请返回JSON格式：
        {
          "splitMethod": "equal/custom/percentage",
          "participants": [
            {
              "userId": "用户ID",
              "username": "用户名",
              "shareAmount": 分摊金额（custom模式）,
              "sharePercentage": 分摊百分比（percentage模式）,
              "reason": "分摊原因说明"
            }
          ]
        }
        
        规则：
        1. equal: 平均分摊给所有参与者
        2. custom: 自定义金额，shareAmount总和必须等于总金额
        3. percentage: 按百分比分摊，总和必须是100
      `

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: '你是一个公平的费用分摊专家，擅长根据实际情况建议合理的分摊方案。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      })

      const result = JSON.parse(completion.choices[0].message.content || '{}')

      if (!result.participants || result.participants.length === 0) {
        return {
          splitMethod: 'equal',
          participants: members.map((m) => ({
            userId: m.userId,
            username: m.user.username,
            shareAmount: amount / members.length,
          })),
        }
      }

      return result
    } catch (error) {
      console.error('分摊建议错误:', error)
      const members = await prisma.tripMember.findMany({
        where: { tripId, isActive: true },
        include: { user: true },
      })

      return {
        splitMethod: 'equal',
        participants: members.map((m) => ({
          userId: m.userId,
          username: m.user.username,
          shareAmount: amount / members.length,
        })),
      }
    }
  }
}

export const aiService = new AIService()