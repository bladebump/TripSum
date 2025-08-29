import OpenAI from 'openai'
import { PrismaClient } from '@prisma/client'
import { ExpenseParseResult } from '../types'
import { executeCalculation } from '../utils/calculator'

const prisma = new PrismaClient()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
})

export class AIService {
  async parseExpenseDescription(tripId: string, description: string, memberList?: any[], currentUserId?: string): Promise<ExpenseParseResult> {
    try {
      let members: any[]
      let memberNames: string
      let currentUserName: string = ''
      
      if (memberList && memberList.length > 0) {
        // 使用前端传递的成员信息，保留所有字段
        members = memberList.map(m => ({
          id: m.id,
          userId: m.userId,
          name: m.name,
          isVirtual: m.isVirtual,
          role: m.role  // 保留role字段用于识别管理员
        }))
        memberNames = members
          .map(m => `${m.name}${m.isVirtual ? '(虚拟)' : ''}`)
          .join(', ')
        
        // 找出当前用户（currentUserId是真实用户的User.id）
        const currentMember = memberList.find(m => m.userId === currentUserId)
        currentUserName = currentMember?.name || ''
      } else {
        // 从数据库查询成员信息
        const dbMembers = await prisma.tripMember.findMany({
          where: { tripId, isActive: true },
          include: { user: true },
        })
        
        members = dbMembers.map(m => ({
          id: m.userId || m.id,
          name: m.isVirtual ? m.displayName : m.user?.username,
          isVirtual: m.isVirtual || false
        }))
        
        memberNames = members
          .map(m => `${m.name}${m.isVirtual ? '(虚拟)' : ''}`)
          .join(', ')
        
        // 找出当前用户
        const currentMember = dbMembers.find(m => m.userId === currentUserId)
        currentUserName = currentMember?.isVirtual 
          ? currentMember.displayName || ''
          : currentMember?.user?.username || ''
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
                  description: '运算类型'
                },
                a: {
                  type: 'number',
                  description: '第一个数'
                },
                b: {
                  type: 'number',
                  description: '第二个数'
                }
              },
              required: ['operation', 'a', 'b']
            }
          }
        }
      ]

      // 找出管理员
      const adminMember = members.find(m => m.role === 'admin')
      const adminName = adminMember ? 
        (adminMember.isVirtual ? adminMember.displayName : adminMember.name) : 
        '管理员'
      
      const prompt = `
        你是一个智能账单解析助手。请使用calculate工具进行所有数学计算，不要自己心算。
        
        团队成员：${memberNames}（共${members.length}人）
        管理员：${adminName}
        当前用户：${currentUserName}（当用户说"我"时，指的是${currentUserName}）
        消费描述：${description}
        
        这是一条支出记录，请解析消费信息。
        
        计算规则：
        1. 平均分摊：使用calculate('divide', 总金额, 参与人数)计算每人金额
        2. "每人X元"：使用calculate('multiply', X, 人数)计算总金额
        3. 所有金额计算必须使用calculate工具
        
        付款人识别规则：
        1. "张三付了X元" → payerName: "张三"
        2. "李四请客" → payerName: "李四"
        3. "我付了" → payerName: "${currentUserName}"
        4. 没有明确付款人时 → payerName: "${adminName}"（管理员默认付款）
        
        请返回JSON格式：
        {
          "amount": 总金额（正数）,
          "description": "简洁但有意义的描述（如：晚餐-海鲜、打车-去机场）",
          "perPersonAmount": 每人金额（如果描述是"每人X元"的格式）,
          "participants": [
            {
              "username": "参与者名字",
              "memberId": "成员ID",
              "shareAmount": 应分摊金额（正数）
            }
          ],
          "excludedMembers": ["被排除的成员名"],
          "category": "类别（餐饮/交通/住宿/娱乐/购物/其他）",
          "confidence": 置信度（0-1之间的数字）,
          "payerName": "付款人名字"
        }
        
        参与者识别规则：
        1. "ABC三人消费"：只有ABC参与，计算时用3人
        2. "除了D都参与"：排除D，计算时用总人数-1
        3. "每人100元"：这是每人金额，需要乘以人数得总额
        4. "我和张三一起" → 包括当前用户(${currentUserName})和张三两人
        5. "和我一起" → 必须包括当前用户(${currentUserName})
        6. 如果没有明确说明谁参与，默认所有人参与
      `

      const messages: any[] = [
        {
          role: 'system',
          content: '你是一个专业的账单解析助手。使用calculate工具进行所有数学计算。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ]

      let completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: messages,
        tools: tools,
        tool_choice: 'auto',
        temperature: 0.3,
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
              role: 'tool',
              content: result.toString(),
              tool_call_id: toolCall.id,
            })
          }
        }

        // 继续对话获取最终结果
        completion = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4',
          messages: messages,
          tools: tools,
          tool_choice: 'auto',
          response_format: { type: 'json_object' },
          temperature: 0.3,
        })
      }

      const result = JSON.parse(completion.choices[0].message.content || '{}')

      // 匹配付款人ID
      if (result.payerName) {
        const payerMember = members.find(
          (m) => m.name && m.name.toLowerCase() === result.payerName.toLowerCase()
        )
        if (payerMember) {
          result.payerId = payerMember.id
        }
      } else {
        // 如果没有识别出付款人，默认使用管理员
        if (adminMember) {
          result.payerId = adminMember.id
          result.payerName = adminName
        }
      }

      // 匹配参与者ID - 统一使用memberId
      if (result.participants && result.participants.length > 0) {
        for (const participant of result.participants) {
          const member = members.find(
            (m) => m.name && m.name.toLowerCase() === participant.username.toLowerCase()
          )
          if (member) {
            participant.memberId = member.id  // 统一使用memberId
          }
        }
      }
      
      // 处理排除的成员
      if (result.excludedMembers && result.excludedMembers.length > 0) {
        // 如果有排除成员，从所有成员中移除这些成员作为参与者
        const excludedNames = result.excludedMembers.map((n: string) => n.toLowerCase())
        const participantMembers = members.filter(
          m => !excludedNames.includes(m.name?.toLowerCase())
        )
        
        // 如果没有明确的参与者列表，使用排除后的成员列表
        if (!result.participants || result.participants.length === 0) {
          result.participants = participantMembers.map(m => ({
            memberId: m.id,  // 统一使用memberId
            username: m.name
          }))
        }
      }

      return {
        amount: result.amount,
        description: result.description,
        perPersonAmount: result.perPersonAmount,
        participants: result.participants,
        excludedMembers: result.excludedMembers,
        category: result.category,
        confidence: result.confidence || 0.5,
        payerId: result.payerId,
        payerName: result.payerName
      } as any // 临时解决类型问题
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
      memberId: string  // 改为使用memberId
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
        .map((m) => {
          const name = m.isVirtual ? (m.displayName || '虚拟成员') : m.user?.username
          return `${name} (ID: ${m.id})`  // 使用TripMember.id
        })
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
              "memberId": "成员ID",
              "username": "成员名称",
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
            memberId: m.id,  // 使用TripMember.id
            username: m.isVirtual ? (m.displayName || '虚拟成员') : m.user?.username || '未知',
            shareAmount: amount / members.length,  // 所有成员平均分摊
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
          memberId: m.id,  // 使用TripMember.id
          username: m.isVirtual ? (m.displayName || '虚拟成员') : m.user?.username || '未知',
          shareAmount: amount / members.length,  // 所有成员平均分摊
        })),
      }
    }
  }
}

export const aiService = new AIService()