import OpenAI from 'openai'
import { PrismaClient } from '@prisma/client'
import { MemberParseResult } from '../types/ai.types'

const prisma = new PrismaClient()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
})

export class MemberParser {
  async parseMembers(tripId: string, text: string): Promise<MemberParseResult> {
    try {
      // 获取现有成员列表，避免重复添加
      const existingMembers = await prisma.tripMember.findMany({
        where: { tripId, isActive: true },
        include: { user: true }
      })

      const existingNames = existingMembers
        .map(m => m.isVirtual ? m.displayName : m.user?.username)
        .filter(Boolean)
        .join('、')

      const prompt = `
        从用户输入中提取需要添加的成员姓名。

        现有成员：${existingNames || '无'}
        用户输入：${text}

        请识别出需要添加的新成员名字，注意：
        1. 排除已存在的成员
        2. 识别中文姓名，包括全名和昵称
        3. 处理常见的称呼（如：小明、老张、张总、阿强等）
        4. 识别"添加"、"加入"、"新增"、"新来的"等关键词
        5. 识别数量词（如：三个人、两位朋友等）
        6. 识别列举方式（顿号、逗号、和、与、跟等）

        返回JSON格式：
        {
          "members": [
            {
              "displayName": "成员姓名",
              "confidence": 置信度(0-1)
            }
          ],
          "confidence": 整体置信度(0-1),
          "totalCount": 总人数（如果提到具体数量）
        }

        示例：
        - "添加张三、李四、王五" → 返回三个成员
        - "加入小明小红" → 返回两个成员  
        - "新增阿华" → 返回一个成员
        - "带了三个朋友：阿华、阿亮、小美" → 返回三个成员
        - "新来了两个人" → 返回totalCount: 2，members为空（需要进一步询问姓名）
        - "和新朋友小李一起吃饭" → 返回小李（识别"新朋友"关键词）
      `

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'system', 
            content: '你是一个专业的中文姓名识别助手，擅长从自然语言中提取人名信息。特别注意识别"添加"、"新增"、"加入"等关键词后面的人名。'
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
        members: result.members || [],
        confidence: result.confidence || 0.5,
        totalCount: result.totalCount
      }
    } catch (error) {
      console.error('成员解析失败:', error)
      return {
        members: [],
        confidence: 0
      }
    }
  }

  async validateMembers(tripId: string, members: string[]): Promise<{
    valid: string[]
    duplicates: string[]
    invalid: string[]
  }> {
    try {
      // 获取现有成员
      const existingMembers = await prisma.tripMember.findMany({
        where: { tripId, isActive: true },
        include: { user: true }
      })

      const existingNames = new Set(
        existingMembers
          .map(m => (m.isVirtual ? m.displayName : m.user?.username)?.toLowerCase())
          .filter(Boolean)
      )

      const valid: string[] = []
      const duplicates: string[] = []
      const invalid: string[] = []

      for (const memberName of members) {
        const trimmedName = memberName.trim()
        
        // 检查是否为空或过短
        if (!trimmedName || trimmedName.length < 1) {
          invalid.push(memberName)
          continue
        }

        // 检查长度限制
        if (trimmedName.length > 20) {
          invalid.push(memberName)
          continue
        }

        // 检查是否已存在
        if (existingNames.has(trimmedName.toLowerCase())) {
          duplicates.push(memberName)
          continue
        }

        valid.push(trimmedName)
      }

      return { valid, duplicates, invalid }
    } catch (error) {
      console.error('成员验证失败:', error)
      return {
        valid: [],
        duplicates: members,
        invalid: []
      }
    }
  }

  async batchAddVirtualMembers(tripId: string, memberNames: string[], addedBy: string) {
    const results = {
      added: [] as any[],
      failed: [] as { name: string; error: string }[]
    }

    for (const name of memberNames) {
      try {
        // 检查是否已存在同名成员
        const existing = await prisma.tripMember.findFirst({
          where: {
            tripId,
            isVirtual: true,
            displayName: name.trim(),
            isActive: true
          }
        })

        if (existing) {
          results.failed.push({ name, error: '成员已存在' })
          continue
        }

        const member = await prisma.tripMember.create({
          data: {
            tripId,
            displayName: name.trim(),
            isVirtual: true,
            createdBy: addedBy,
            role: 'member'
          },
          include: {
            user: true,
            creator: true
          }
        })

        results.added.push(member)
      } catch (error) {
        results.failed.push({ 
          name, 
          error: error instanceof Error ? error.message : '添加失败' 
        })
      }
    }

    return results
  }
}

export const memberParser = new MemberParser()