# AI功能接口文档

## 概述

AI功能模块提供自然语言处理能力，支持智能记账、成员识别和混合意图处理。采用模块化架构，包含意图识别、专项解析和Function Calling计算器功能。

## 核心功能

- **意图识别**：识别用户输入的意图类型（支出、成员、结算、混合等）
- **智能解析**：提取金额、参与者、类别等信息
- **成员匹配**：智能匹配现有成员或识别新成员
- **计算器工具**：使用Function Calling进行精确计算
- **基金识别**：识别基金缴纳相关关键词

## 接口列表

### 1. 生成旅行AI总结

生成行程的智能总结报告。

**GET** `/trips/:id/summary`

#### 请求头

```
Authorization: Bearer <token>
```

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 行程ID |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "summary": {
      "overview": "本次北京5日游共有5位成员参与，总支出10000元",
      "highlights": [
        "人均消费2000元",
        "餐饮是最大开销，占比50%",
        "行程圆满完成，所有账目已结清"
      ],
      "details": {
        "members": 5,
        "totalExpenses": 10000,
        "duration": "5天",
        "mainCategories": ["餐饮", "交通", "住宿"]
      }
    }
  }
}
```

### 2. 导出旅行AI总结

导出行程的AI总结报告为文件。

**GET** `/trips/:id/summary/export`

#### 请求头

```
Authorization: Bearer <token>
```

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 行程ID |

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| format | string | 否 | 导出格式：pdf/markdown，默认pdf |

#### 响应

返回文件下载流，Content-Type根据格式而定。

### 3. 统一智能解析入口

解析自然语言输入，返回结构化的记账数据。

**POST** `/ai/parse`

#### 请求头

```
Authorization: Bearer <token>
```

#### 请求体

```json
{
  "tripId": "trip-uuid",
  "text": "昨天晚上吃海鲜花了500，张三李四参加，我付的钱",
  "members": [
    {
      "id": "member-uuid-1",
      "userId": "user-uuid",
      "name": "当前用户",
      "isVirtual": false
    },
    {
      "id": "member-uuid-2",
      "userId": null,
      "name": "张三",
      "isVirtual": true
    },
    {
      "id": "member-uuid-3",
      "userId": null,
      "name": "李四",
      "isVirtual": true
    }
  ],
  "currentUserId": "user-uuid"
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| tripId | string | 是 | 行程ID |
| text | string | 是 | 自然语言输入文本 |
| members | array | 是 | 行程成员列表 |
| currentUserId | string | 否 | 当前用户ID，用于识别"我"等代词 |

#### 响应示例 - 支出意图

```json
{
  "success": true,
  "data": {
    "intent": {
      "intent": "expense",
      "confidence": 0.95
    },
    "data": {
      "amount": 500,
      "description": "晚餐-海鲜",
      "participants": [
        {
          "memberId": "member-uuid-1",
          "username": "当前用户",
          "shareAmount": 166.67
        },
        {
          "memberId": "member-uuid-2",
          "displayName": "张三",
          "shareAmount": 166.67
        },
        {
          "memberId": "member-uuid-3",
          "displayName": "李四",
          "shareAmount": 166.67
        }
      ],
      "category": "餐饮",
      "categoryId": "category-uuid",
      "confidence": 0.95,
      "payerId": "member-uuid-1",
      "payerName": "当前用户",
      "isIncome": false,
      "expenseDate": "2024-02-25",
      "calculations": {
        "total": 500,
        "perPerson": 166.67,
        "participantCount": 3
      }
    }
  }
}
```

#### 响应示例 - 成员意图

```json
{
  "success": true,
  "data": {
    "intent": {
      "intent": "member",
      "confidence": 0.90
    },
    "data": {
      "action": "add",
      "members": ["王五", "赵六"],
      "confidence": 0.90
    }
  }
}
```

#### 响应示例 - 混合意图

```json
{
  "success": true,
  "data": {
    "intent": {
      "intent": "mixed",
      "confidence": 0.85
    },
    "data": {
      "newMembers": ["王五"],
      "expense": {
        "amount": 300,
        "description": "KTV",
        "participants": [
          {
            "memberId": "member-uuid-1",
            "username": "当前用户",
            "shareAmount": 100
          },
          {
            "name": "王五",
            "isNew": true,
            "shareAmount": 100
          },
          {
            "memberId": "member-uuid-2",
            "displayName": "张三",
            "shareAmount": 100
          }
        ],
        "category": "娱乐",
        "payerId": "member-uuid-1"
      }
    }
  }
}
```

#### 响应示例 - 基金缴纳

```json
{
  "success": true,
  "data": {
    "intent": {
      "intent": "expense",
      "confidence": 0.92
    },
    "data": {
      "amount": 1000,
      "description": "基金缴纳",
      "isIncome": true,
      "participants": [
        {
          "memberId": "member-uuid-1",
          "username": "张三",
          "contribution": 1000
        }
      ],
      "category": "基金",
      "fundRelated": true
    }
  }
}
```

### 4. 批量添加成员

通过成员名称列表批量添加虚拟成员。

**POST** `/ai/add-members`

#### 请求头

```
Authorization: Bearer <token>
```

#### 请求体

```json
{
  "tripId": "trip-uuid",
  "memberNames": ["张三", "李四", "王五"]
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "success": true,
    "added": [
      {
        "id": "member-uuid-new-1",
        "displayName": "张三",
        "isVirtual": true
      },
      {
        "id": "member-uuid-new-2",
        "displayName": "王五",
        "isVirtual": true
      }
    ],
    "failed": [
      {
        "name": "李四",
        "error": "成员已存在"
      }
    ],
    "validation": {
      "valid": ["张三", "王五"],
      "duplicates": ["李四"],
      "invalid": []
    }
  }
}
```


## 支持的意图类型

| 意图类型 | 说明 | 示例 |
|----------|------|------|
| expense | 支出记录 | "吃饭花了100元" |
| member | 成员管理 | "添加成员小明" |
| settlement | 结算查询 | "我该收多少钱" |
| mixed | 混合意图 | "和新朋友小王吃饭100" |
| income | 收入/基金 | "张三缴纳基金1000" |
| unknown | 无法识别 | "今天天气真好" |

## AI能力特性

### 计算器功能

AI集成了Function Calling计算器，支持：
- 基础运算：加减乘除
- 均分计算：自动计算人均金额
- 百分比计算：处理折扣、税费等
- 精确计算：避免浮点数精度问题

示例：
- "300元5个人平分" → 每人60元
- "总共500，我付了300" → 我的份额300元
- "打8折，原价200" → 实付160元

### 时间识别

智能识别各种时间表述：
- 相对时间："昨天"、"前天"、"上周三"
- 具体日期："2月26日"、"2024-02-26"
- 模糊时间："刚才"、"早上"、"晚上"

### 成员识别

智能匹配成员：
- 代词识别："我"、"我们"、"大家"
- 模糊匹配：识别相似名称
- 新成员检测：自动识别未知成员
- 关系识别："除了我"、"我和张三"

### 类别推断

基于描述智能推断类别：
- 餐饮：包含"吃"、"餐"、"饭"等关键词
- 交通：包含"打车"、"地铁"、"机票"等
- 住宿：包含"酒店"、"住宿"、"房间"等
- 购物：包含"买"、"购"、"商场"等
- 娱乐：包含"KTV"、"电影"、"游戏"等

### 基金识别

识别基金相关操作：
- 缴纳关键词："缴纳"、"上缴"、"交钱"、"基金"
- 金额累加：基金缴纳累加到contribution字段
- 自动标记：设置isIncome为true

## 错误处理

| 错误码 | 说明 |
|--------|------|
| 400 | 输入文本为空或格式错误 |
| 401 | 未授权访问 |
| 403 | 无权限操作 |
| 404 | 行程不存在 |
| 422 | AI无法解析输入内容 |
| 429 | 请求频率超限（20次/分钟） |
| 500 | AI服务异常 |

## 使用建议

### 最佳实践

1. **提供完整成员列表**：确保members参数包含所有行程成员
2. **设置currentUserId**：帮助AI识别"我"等代词
3. **清晰的描述**：金额、参与者、事项描述要清晰
4. **处理混合意图**：先添加新成员，再创建支出

### 输入示例

良好的输入：
- "昨晚和张三李四吃饭花了300，AA"
- "打车50元，我付的，大家平分"
- "给小王转账200元，他之前垫付的"

需要改进的输入：
- "花钱了" （缺少金额）
- "300" （缺少context）
- "吃饭" （缺少金额和参与者）

## 示例代码

### JavaScript/TypeScript

```typescript
// AI解析记账
const parseExpense = async (text: string) => {
  const members = await getTripmembers(tripId)
  
  const response = await fetch(`${API_BASE_URL}/ai/parse`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tripId,
      text,
      members,
      currentUserId: userId
    })
  })
  
  const result = await response.json()
  
  // 处理不同意图
  switch (result.data.intent.intent) {
    case 'expense':
      // 创建支出
      await createExpense(result.data.data)
      break
    case 'member':
      // 添加成员
      await addMembers(result.data.data.members)
      break
    case 'mixed':
      // 先添加成员，再创建支出
      await addMembers(result.data.data.newMembers)
      await createExpense(result.data.data.expense)
      break
  }
  
  return result
}

// 批量添加成员
const batchAddMembers = async (names: string[]) => {
  const response = await fetch(`${API_BASE_URL}/ai/add-members`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tripId,
      memberNames: names
    })
  })
  
  return response.json()
}
```

## 配置说明

### AI模型配置

系统支持多种AI模型：
- OpenAI GPT-4
- Claude API
- Moonshot (Kimi)

在后端环境变量中配置：
```env
AI_PROVIDER=openai
OPENAI_API_KEY=your-api-key
AI_MODEL=gpt-4
```

### 限流配置

AI接口限流：20次/分钟
可在后端配置调整：
```javascript
// middleware/rateLimiter.ts
aiLimiter: rateLimit({
  windowMs: 60 * 1000,
  max: 20
})
```

---
*最后更新: 2025-09-04*  
*版本: v1.9.0*