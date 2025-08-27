import OpenAI from 'openai'
import { IntentResult } from '../types/ai.types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
})

export class AIIntentService {
  async classifyIntent(text: string): Promise<IntentResult> {
    try {
      const prompt = `
        分析用户输入的意图。请判断用户想要执行的操作类型：

        用户输入：${text}
        
        意图类型：
        1. expense: 记录支出或收入 (如："昨天吃饭100元"、"打车50"、"收到退款200")
        2. member: 添加或管理成员 (如："添加张三李四"、"加入小明")  
        3. settlement: 结算相关 (如："结算一下"、"谁欠谁钱")
        4. mixed: 混合意图 (如："和新来的王五一起吃饭100元" - 同时包含添加成员和记账)
        5. unknown: 无法识别的意图

        请返回JSON格式：
        {
          "intent": "主要意图类型",
          "confidence": 置信度(0-1),
          "subIntents": [
            {
              "intent": "子意图类型",
              "confidence": 置信度
            }
          ]
        }

        识别规则：
        - 包含金额和人名 → mixed
        - 只有金额相关 → expense  
        - 只有人名/添加相关 → member
        - 结算/债务相关 → settlement
        - 其他 → unknown
      `

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的意图识别助手，擅长分析用户的真实意图。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      })

      const result = JSON.parse(completion.choices[0].message.content || '{}')
      
      return {
        intent: result.intent || 'unknown',
        confidence: result.confidence || 0.5,
        subIntents: result.subIntents || []
      }
    } catch (error) {
      console.error('意图识别失败:', error)
      return {
        intent: 'unknown',
        confidence: 0
      }
    }
  }
}

export const aiIntentService = new AIIntentService()