import OpenAI from 'openai'
import { executeCalculation } from '../utils/calculator'

export interface ContributionParseResult {
  amount: number
  description: string
  perPersonAmount?: number
  participants: Array<{
    username: string
    shareAmount: number
    userId?: string
  }>
  excludedMembers?: string[]
  category: string
  confidence: number
  payerId: null
  payerName: null
  isContribution: true
}

export class ContributionParser {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL
    })
  }

  async parseContribution(
    _tripId: string, // 标记为未使用，避免TypeScript警告
    text: string,
    members: any[],
    currentUserId?: string
  ): Promise<ContributionParseResult> {
    try {
      // 构建成员信息
      let memberNames = ''
      let currentUserName = '当前用户'
      
      if (members && members.length > 0) {
        // 使用前端传递的成员信息，保留所有字段
        const processedMembers = members.map(m => ({
          id: m.id,
          userId: m.userId,
          name: m.name,
          isVirtual: m.isVirtual,
          role: m.role
        }))
        
        memberNames = processedMembers
          .map(m => `${m.name}${m.isVirtual ? '(虚拟)' : ''}`)
          .join(', ')
        
        // 找当前用户名
        if (currentUserId) {
          const currentMember = processedMembers.find(m => m.userId === currentUserId)
          if (currentMember) {
            currentUserName = currentMember.name
          }
        }
      }

      // 定义计算工具
      const tools = [
        {
          type: 'function' as const,
          function: {
            name: 'calculate',
            description: '执行基础数学计算：加减乘除',
            parameters: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  enum: ['add', 'subtract', 'multiply', 'divide'],
                  description: '运算操作：add(加法)、subtract(减法)、multiply(乘法)、divide(除法)'
                },
                a: {
                  type: 'number',
                  description: '第一个数字'
                },
                b: {
                  type: 'number',
                  description: '第二个数字'
                }
              },
              required: ['operation', 'a', 'b']
            }
          }
        }
      ]

      const prompt = `
        你是一个智能基金缴纳解析助手。请使用calculate工具进行所有数学计算，不要自己心算。
        
        团队成员：${memberNames}（共${members.length}人）
        当前用户：${currentUserName}（当用户说"我"时，指的是${currentUserName}）
        缴纳描述：${text}
        
        这是一条基金缴纳记录，请解析缴纳信息。基金缴纳的特点：
        1. 每个人向基金池缴纳资金
        2. 可能是统一金额，也可能是个性化金额
        3. 没有付款人概念（所有人都是缴纳者）
        
        常见基金缴纳场景：
        1. "每人预存1000" → 所有人各缴纳1000
        2. "预存200，我多交5000" → 其他人各200，我缴纳200+5000=5200
        3. "我交3000，张三交2000，其他人各1000" → 个性化缴纳
        
        计算规则：
        1. 平均缴纳：使用calculate('multiply', 每人金额, 人数)计算总金额
        2. 个性化缴纳：使用calculate('add', 各人金额)计算总金额  
        3. "预存X，我多交Y"：其他人各缴纳X，当前用户缴纳calculate('add', X, Y)
        4. 所有金额计算必须使用calculate工具
        
        请返回JSON格式：
        {
          "amount": 总缴纳金额（正数）,
          "description": "简洁描述（如：基金缴纳-每人1000、基金缴纳-个性化）",
          "perPersonAmount": 统一每人金额（如果是统一缴纳）,
          "participants": [
            {
              "username": "缴纳者的实际名字（不要用'当前用户'，要用实际姓名如'${currentUserName}'）",
              "shareAmount": 该人缴纳金额（正数）
            }
          ],
          "excludedMembers": ["不参与缴纳的成员"],
          "category": "基金",
          "confidence": 置信度（0-1之间的数字）
        }
        
        重要：当遇到"我"的时候，请在participants中使用实际姓名"${currentUserName}"，而不是"当前用户"。
        
        缴纳者识别规则：
        1. "每人X元"：所有人都缴纳X元
        2. "预存X，我多交Y"：其他人各X，当前用户X+Y
        3. "我交X，张三交Y"：明确指定个人缴纳额
        4. "除了李四，每人1000"：排除李四，其他人各1000
        5. 如果没有明确排除，默认所有人都参与缴纳
        6. 缴纳金额必须为正数
      `

      const messages: any[] = [
        {
          role: 'system',
          content: '你是一个专业的基金缴纳解析助手。使用calculate工具进行所有数学计算。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ]

      let completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages,
        tools: tools,
        tool_choice: 'auto',
        temperature: 0.1,
      })

      // 处理工具调用
      while (completion.choices[0].message.tool_calls) {
        const toolCalls = completion.choices[0].message.tool_calls
        messages.push(completion.choices[0].message)

        for (const toolCall of toolCalls) {
          if (toolCall.function.name === 'calculate') {
            const args = JSON.parse(toolCall.function.arguments)
            const result = executeCalculation(args.operation, args.a, args.b)
            
            messages.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              content: result.toString()
            })
          }
        }

        completion = await this.openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4',
          messages: messages,
          tools: tools,
          tool_choice: 'auto',
          temperature: 0.1,
        })
      }

      const content = completion.choices[0]?.message?.content
      if (!content) {
        throw new Error('AI返回内容为空')
      }

      // 解析JSON结果
      let result: any
      try {
        // 尝试提取JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        const jsonStr = jsonMatch ? jsonMatch[0] : content
        result = JSON.parse(jsonStr)
      } catch (parseError) {
        console.error('JSON解析失败:', parseError, '原始内容:', content)
        throw new Error('AI返回格式错误，无法解析')
      }

      // 确保必要字段存在并设置基金缴纳特有属性
      const contributionResult: ContributionParseResult = {
        amount: Math.abs(result.amount || 0),
        description: result.description || '基金缴纳',
        perPersonAmount: result.perPersonAmount,
        participants: result.participants || [],
        excludedMembers: result.excludedMembers || [],
        category: '基金',
        confidence: result.confidence || 0.5,
        payerId: null,
        payerName: null,
        isContribution: true
      }

      // 确保所有缴纳金额为正数
      contributionResult.participants = contributionResult.participants.map(p => ({
        ...p,
        shareAmount: Math.abs(p.shareAmount || 0)
      }))

      return contributionResult

    } catch (error) {
      console.error('基金缴纳解析失败:', error)
      throw new Error(`基金缴纳解析失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }
}

// 导出单例
export const contributionParser = new ContributionParser()