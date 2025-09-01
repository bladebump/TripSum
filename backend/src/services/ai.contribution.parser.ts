import OpenAI from 'openai'

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

      // 获取当前日期信息
      const today = new Date()
      const currentYear = today.getFullYear()
      const currentMonth = today.getMonth() + 1

      const prompt = `
        你是一个智能基金缴纳解析助手。请准确解析缴纳信息。
        
        当前信息：
        - 团队成员：${memberNames}（共${members.length}人）
        - 当前用户：${currentUserName}（当用户说"我"时，指的是${currentUserName}）
        - 今天日期：${currentYear}年${currentMonth}月${today.getDate()}日
        
        用户输入：${text}
        
        解析示例：
        1. "每人预存1000" → perPersonAmount: 1000, participants: 所有人各1000
        2. "预存200，我多交5000" → participants: 其他人200，${currentUserName} 5200
        3. "我交3000，张三交2000，其他人各1000" → 个性化缴纳
        4. "先交500做启动资金" → perPersonAmount: 500
        5. "除了李四，每人上交1000" → excludedMembers: ["李四"], perPersonAmount: 1000
        6. "为下周的活动预存费用，每人2000" → perPersonAmount: 2000, description: "基金缴纳-下周活动"
        
        请返回JSON格式：
        {
          "perPersonAmount": 统一每人金额（如果是统一缴纳）,
          "description": "简洁描述",
          "participants": [
            {
              "username": "缴纳者姓名（'我'要替换为'${currentUserName}'）",
              "shareAmount": 该人缴纳金额（直接返回数字，不要计算）
            }
          ],
          "excludedMembers": ["不参与缴纳的成员"],
          "category": "基金",
          "confidence": 置信度（0-1之间的数字）
        }
        
        重要规则：
        1. 不要进行任何数学计算，只返回原始数字
        2. 如果是"每人X元"，返回perPersonAmount=X
        3. 如果是"预存X，我多交Y"，${currentUserName}的shareAmount=X+Y（你自己加），其他人=X
        4. 如果没有明确指定谁缴纳，且有perPersonAmount，不需要返回participants
        5. 当遇到"我"时，必须替换为"${currentUserName}"
      `

      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的基金缴纳解析助手。准确提取信息，不进行计算。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      })

      const content = completion.choices[0]?.message?.content
      if (!content) {
        throw new Error('AI返回内容为空')
      }

      // 解析JSON结果
      const result = JSON.parse(content)

      // 处理参与者和计算总额
      let finalParticipants = result.participants || []
      let totalAmount = 0
      
      if (result.perPersonAmount && !result.participants) {
        // 如果是统一缴纳且没有指定参与者，所有人都参与
        const excludedNames = (result.excludedMembers || []).map((n: string) => n.toLowerCase())
        const participantMembers = members.filter(
          m => !excludedNames.includes(m.name?.toLowerCase())
        )
        
        finalParticipants = participantMembers.map(m => ({
          username: m.name,
          shareAmount: result.perPersonAmount
        }))
        
        totalAmount = result.perPersonAmount * participantMembers.length
      } else if (result.participants && result.participants.length > 0) {
        // 个性化缴纳，计算总额
        totalAmount = result.participants.reduce((sum: number, p: any) => 
          sum + (p.shareAmount || 0), 0
        )
        finalParticipants = result.participants
      } else if (result.perPersonAmount) {
        // 有每人金额但没有参与者列表，默认所有人
        finalParticipants = members.map(m => ({
          username: m.name,
          shareAmount: result.perPersonAmount
        }))
        totalAmount = result.perPersonAmount * members.length
      }

      // 确保必要字段存在并设置基金缴纳特有属性
      const contributionResult: ContributionParseResult = {
        amount: Math.abs(totalAmount),
        description: result.description || '基金缴纳',
        perPersonAmount: result.perPersonAmount,
        participants: finalParticipants.map((p: any) => ({
          ...p,
          shareAmount: Math.abs(p.shareAmount || 0)
        })),
        excludedMembers: result.excludedMembers || [],
        category: '基金',
        confidence: result.confidence || 0.5,
        payerId: null,
        payerName: null,
        isContribution: true
      }

      return contributionResult

    } catch (error) {
      console.error('基金缴纳解析失败:', error)
      throw new Error(`基金缴纳解析失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }
}

// 导出单例
export const contributionParser = new ContributionParser()