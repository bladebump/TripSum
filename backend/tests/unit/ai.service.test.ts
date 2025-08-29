import { AIIntentService } from '../../src/services/ai.intent.service'
import { AIUnifiedParser } from '../../src/services/ai.unified.parser'

describe('AI Service - 真实API测试', () => {
  const intentService = new AIIntentService()
  const unifiedParser = new AIUnifiedParser()

  // 跳过这些测试如果没有配置API密钥
  const skipIfNoApiKey = process.env.OPENAI_API_KEY ? describe : describe.skip

  skipIfNoApiKey('AIIntentService - 意图识别', () => {
    it('应该识别支出意图', async () => {
      const result = await intentService.classifyIntent(
        '张三付了100元午餐，大家AA'
      )
      
      expect(result).toBeDefined()
      expect(result.intent).toBe('expense')
      expect(result.confidence).toBeGreaterThan(0.7)
    }, 15000) // 15秒超时，因为API调用可能慢

    it('应该识别基金缴纳意图', async () => {
      const result = await intentService.classifyIntent(
        '李四缴纳了500元基金'
      )
      
      expect(result.intent).toBe('income')
      expect(result.confidence).toBeGreaterThan(0.7)
    }, 15000)

    it('应该识别添加成员意图', async () => {
      const result = await intentService.classifyIntent(
        '添加成员王五和赵六'
      )
      
      expect(result.intent).toBe('member')
      expect(result.confidence).toBeGreaterThan(0.7)
    }, 15000)

    it('应该识别混合意图', async () => {
      const result = await intentService.classifyIntent(
        '张三垫付了200元晚餐，李四缴纳300元基金，添加成员王五'
      )
      
      expect(result.intent).toBe('mixed')
      expect(result.confidence).toBeGreaterThan(0.7)
    }, 15000)

    it('应该识别结算意图', async () => {
      const result = await intentService.classifyIntent(
        '我们来结算一下吧'
      )
      
      expect(result.intent).toBe('settlement')
      expect(result.confidence).toBeGreaterThan(0.7)
    }, 15000)
  })

  skipIfNoApiKey('AIUnifiedParser - 统一解析', () => {
    const mockMembers = [
      { id: 'm1', name: '张三', isVirtual: false, role: 'admin' },
      { id: 'm2', name: '李四', isVirtual: false, role: 'member' },
      { id: 'm3', name: '虚拟王五', isVirtual: true, role: 'member' }
    ]

    it('应该解析支出信息', async () => {
      const result = await unifiedParser.parseExpenseText(
        '张三请客吃饭花了300元，大家平分',
        mockMembers
      )

      expect(result.intent).toBe('expense')
      expect(result.data).toHaveProperty('amount')
      expect(result.data.amount).toBe(300)
      expect(result.data).toHaveProperty('payerName')
      expect(result.data.payerName).toBe('张三')
      expect(result.data).toHaveProperty('participants')
      expect(result.data.participants).toContain('张三')
      expect(result.data.participants).toContain('李四')
    }, 20000)

    it('应该解析基金缴纳信息', async () => {
      const result = await unifiedParser.parseExpenseText(
        '李四上缴基金1000元',
        mockMembers
      )

      expect(result.intent).toBe('income')
      expect(result.data).toHaveProperty('contributions')
      expect(result.data.contributions).toBeInstanceOf(Array)
      expect(result.data.contributions[0]).toHaveProperty('username', '李四')
      expect(result.data.contributions[0]).toHaveProperty('amount', 1000)
    }, 20000)

    it('应该处理复杂的自然语言', async () => {
      const result = await unifiedParser.parseExpenseText(
        '昨天晚上我们三个人去吃火锅，张三先付的钱，一共458元，我们AA制',
        mockMembers
      )

      expect(result.intent).toBe('expense')
      expect(result.data.amount).toBe(458)
      expect(result.data.payerName).toBe('张三')
      expect(result.data.participants.length).toBeGreaterThanOrEqual(3)
    }, 20000)

    it('应该识别虚拟成员', async () => {
      const result = await unifiedParser.parseExpenseText(
        '虚拟王五垫付了150元打车费，张三和李四参与',
        mockMembers
      )

      expect(result.intent).toBe('expense')
      expect(result.data.payerName).toBe('虚拟王五')
      expect(result.data.participants).toContain('张三')
      expect(result.data.participants).toContain('李四')
    }, 20000)

    it('应该处理混合场景', async () => {
      const result = await unifiedParser.parseExpenseText(
        '张三付了200元买水果，李四和虚拟王五各缴纳500元基金',
        mockMembers
      )

      expect(result.intent).toBe('mixed')
      expect(result.data).toHaveProperty('expenses')
      expect(result.data).toHaveProperty('contributions')
      expect(result.data.expenses).toBeInstanceOf(Array)
      expect(result.data.contributions).toBeInstanceOf(Array)
      expect(result.data.expenses[0].amount).toBe(200)
      expect(result.data.contributions.length).toBe(2)
    }, 20000)

    it('应该处理计算表达式', async () => {
      const result = await unifiedParser.parseExpenseText(
        '我们买了3张门票，每张80元，张三付的钱',
        mockMembers
      )

      expect(result.intent).toBe('expense')
      expect(result.data.amount).toBe(240) // 3 * 80
      expect(result.data.payerName).toBe('张三')
    }, 20000)

    it('应该识别基金池支付', async () => {
      const result = await unifiedParser.parseExpenseText(
        '用基金池付了500元住宿费',
        mockMembers
      )

      expect(result.intent).toBe('expense')
      expect(result.data.amount).toBe(500)
      // 管理员代表基金池
      expect(result.data.payerName).toBe('张三')
    }, 20000)
  })

  // 简单的mock测试，不需要真实API
  describe('AI Service - Mock测试', () => {
    it('应该处理空输入', async () => {
      const result = await intentService.classifyIntent('')
      expect(result.intent).toBe('unknown')
      expect(result.confidence).toBe(0)
    })

    it('应该处理超长输入', async () => {
      const longText = '测试'.repeat(1000)
      const result = await intentService.classifyIntent(longText)
      expect(result).toBeDefined()
      expect(result.intent).toBeDefined()
    })
  })
})