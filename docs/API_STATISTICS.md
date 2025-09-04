# 统计与结算接口文档

## 概述

统计与结算模块提供行程的财务统计、余额计算、债务关系分析和结算方案生成功能。支持基金池模式和管理员中心化结算。所有金额计算使用Decimal.js确保精度。

## 接口列表

### 1. 获取行程统计数据

获取行程的完整统计信息，包括支出分析、成员状态和基金池情况。

**GET** `/trips/:id/statistics`

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
    "overview": {
      "totalExpenses": 10000,
      "expenseCount": 50,
      "memberCount": 5,
      "averagePerPerson": 2000,
      "dateRange": {
        "start": "2024-02-26",
        "end": "2024-03-05",
        "days": 8
      }
    },
    "fundPool": {
      "totalContributions": 15000,
      "fundExpenses": 8000,
      "personalExpenses": 2000,
      "balance": 7000,
      "utilizationRate": 53.33
    },
    "categoryBreakdown": [
      {
        "categoryId": "category-uuid-1",
        "categoryName": "餐饮",
        "icon": "🍽️",
        "color": "#FF6B6B",
        "amount": 5000,
        "percentage": 50,
        "count": 20
      },
      {
        "categoryId": "category-uuid-2",
        "categoryName": "交通",
        "icon": "🚗",
        "color": "#4ECDC4",
        "amount": 2000,
        "percentage": 20,
        "count": 10
      }
    ],
    "dailyExpenses": [
      {
        "date": "2024-02-26",
        "amount": 1500,
        "count": 5,
        "categories": [
          {
            "categoryId": "category-uuid-1",
            "amount": 800
          }
        ]
      }
    ],
    "memberStatistics": [
      {
        "memberId": "member-uuid-1",
        "username": "张三",
        "isVirtual": false,
        "contribution": 5000,
        "totalPaid": 3000,
        "totalShares": 2000,
        "balance": 6000,
        "status": "creditor",
        "expenseCount": 15
      },
      {
        "memberId": "member-uuid-2",
        "displayName": "李四",
        "isVirtual": true,
        "contribution": 5000,
        "totalPaid": 1000,
        "totalShares": 2000,
        "balance": 4000,
        "status": "creditor",
        "expenseCount": 5
      }
    ],
    "trends": {
      "daily": {
        "average": 1250,
        "median": 1000,
        "peak": 2500,
        "peakDate": "2024-02-28"
      },
      "growth": {
        "rate": 15.5,
        "direction": "increasing"
      }
    }
  }
}
```

### 2. 获取成员余额信息

获取行程所有成员的余额和债务关系。

**GET** `/trips/:id/balances`

#### 请求头

```
Authorization: Bearer <token>
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "balances": [
      {
        "memberId": "member-uuid-1",
        "username": "张三",
        "isVirtual": false,
        "contribution": 5000,
        "totalPaid": 3000,
        "totalShares": 2000,
        "balance": 6000,
        "status": "creditor",
        "details": {
          "fundPayments": 2000,
          "personalPayments": 1000,
          "reimbursements": 0
        }
      },
      {
        "memberId": "member-uuid-2",
        "displayName": "李四",
        "isVirtual": true,
        "contribution": 3000,
        "totalPaid": 0,
        "totalShares": 2000,
        "balance": 1000,
        "status": "creditor",
        "details": {
          "fundPayments": 0,
          "personalPayments": 0,
          "reimbursements": 0
        }
      },
      {
        "memberId": "member-uuid-3",
        "username": "王五",
        "isVirtual": false,
        "contribution": 2000,
        "totalPaid": 500,
        "totalShares": 3000,
        "balance": -500,
        "status": "debtor",
        "details": {
          "fundPayments": 0,
          "personalPayments": 500,
          "reimbursements": 0
        }
      }
    ],
    "summary": {
      "totalCreditors": 2,
      "totalDebtors": 1,
      "totalCredit": 7000,
      "totalDebt": 500,
      "balanced": false
    }
  }
}
```

### 3. 计算结算方案

生成优化的结算方案，采用管理员中心化结算模式。

**POST** `/trips/:id/calculate`

#### 请求头

```
Authorization: Bearer <token>
```

#### 请求体（可选）

```json
{
  "strategy": "admin-centric",
  "includeVirtual": true
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| strategy | string | 否 | 结算策略：admin-centric（默认）/minimal-transactions |
| includeVirtual | boolean | 否 | 是否包含虚拟成员，默认true |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "settlements": [
      {
        "from": {
          "memberId": "member-uuid-3",
          "username": "王五",
          "isVirtual": false
        },
        "to": {
          "memberId": "member-uuid-1",
          "username": "张三",
          "isVirtual": false,
          "isAdmin": true
        },
        "amount": 500,
        "reason": "行程结算"
      },
      {
        "from": {
          "memberId": "member-uuid-1",
          "username": "张三",
          "isVirtual": false,
          "isAdmin": true
        },
        "to": {
          "memberId": "member-uuid-2",
          "displayName": "李四",
          "isVirtual": true
        },
        "amount": 1000,
        "reason": "虚拟成员退款"
      }
    ],
    "summary": {
      "totalTransactions": 2,
      "totalAmount": 1500,
      "strategy": "admin-centric",
      "adminId": "member-uuid-1"
    },
    "validation": {
      "isValid": true,
      "balanced": true,
      "errors": []
    }
  }
}
```

### 4. 执行结算

确认并执行结算方案，记录结算历史。

**POST** `/trips/:id/settle`

#### 请求头

```
Authorization: Bearer <token>
```

#### 请求体

```json
{
  "settlements": [
    {
      "fromUserId": "member-uuid-3",
      "toUserId": "member-uuid-1",
      "amount": 500
    }
  ],
  "note": "2024年2月旅行结算"
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "settlementId": "settlement-uuid",
    "createdAt": "2024-03-05T10:00:00Z",
    "settlements": [
      {
        "id": "transaction-uuid-1",
        "fromUserId": "member-uuid-3",
        "toUserId": "member-uuid-1",
        "amount": 500,
        "status": "pending",
        "createdAt": "2024-03-05T10:00:00Z"
      }
    ],
    "note": "2024年2月旅行结算"
  }
}
```

### 5. 获取结算历史

查看行程的历史结算记录。

**GET** `/trips/:id/settlements`

#### 请求头

```
Authorization: Bearer <token>
```

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认20 |
| status | string | 否 | 状态筛选：pending/completed/all |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "settlements": [
      {
        "id": "settlement-uuid-1",
        "createdAt": "2024-03-05T10:00:00Z",
        "createdBy": {
          "memberId": "member-uuid-1",
          "username": "张三"
        },
        "transactions": [
          {
            "id": "transaction-uuid-1",
            "from": {
              "memberId": "member-uuid-3",
              "username": "王五"
            },
            "to": {
              "memberId": "member-uuid-1",
              "username": "张三"
            },
            "amount": 500,
            "status": "completed",
            "completedAt": "2024-03-05T11:00:00Z"
          }
        ],
        "totalAmount": 500,
        "note": "2024年2月旅行结算"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5
    }
  }
}
```

### 6. 更新结算状态

标记结算交易为已完成。

**PUT** `/settlements/:transactionId`

#### 请求头

```
Authorization: Bearer <token>
```

#### 请求体

```json
{
  "status": "completed",
  "completedAt": "2024-03-05T11:00:00Z",
  "note": "已通过支付宝转账"
}
```

### 7. 导出统计报表

导出行程的详细财务报表。

**GET** `/trips/:id/export`

#### 请求头

```
Authorization: Bearer <token>
```

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| format | string | 否 | 导出格式：excel/pdf/csv，默认excel |
| includeDetails | boolean | 否 | 是否包含明细，默认true |

#### 响应

返回文件下载流，Content-Type根据格式而定。

### 8. 获取支出趋势

获取支出的时间趋势分析。

**GET** `/trips/:id/trends`

#### 请求头

```
Authorization: Bearer <token>
```

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| period | string | 否 | 时间周期：daily/weekly，默认daily |
| startDate | string | 否 | 开始日期 |
| endDate | string | 否 | 结束日期 |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "period": "daily",
    "trends": [
      {
        "date": "2024-02-26",
        "amount": 1500,
        "count": 5,
        "change": 0,
        "changePercent": 0
      },
      {
        "date": "2024-02-27",
        "amount": 2000,
        "count": 8,
        "change": 500,
        "changePercent": 33.33
      }
    ],
    "analysis": {
      "averageDaily": 1250,
      "peak": {
        "date": "2024-02-28",
        "amount": 3000
      },
      "low": {
        "date": "2024-03-01",
        "amount": 500
      },
      "trend": "increasing",
      "volatility": "moderate"
    }
  }
}
```

## 结算策略说明

### 管理员中心化结算 (admin-centric)

默认策略，所有结算通过管理员进行：
1. 欠款者向管理员转账
2. 管理员向债权者转账
3. 减少直接转账复杂度
4. 管理员作为资金中转节点

### 最小交易数结算 (minimal-transactions)

优化算法，减少交易次数：
1. 计算净债务关系
2. 使用贪心算法优化
3. 生成最少的交易数量

## 使用说明

### 余额计算公式

```
余额 = 基金缴纳 + 个人垫付 - 应付份额

其中：
- 基金缴纳：contribution字段
- 个人垫付：非基金池支付的金额
- 应付份额：参与的支出分摊总和
```

### 状态说明

- **creditor（债权人）**：余额为正，其他人欠他钱
- **debtor（债务人）**：余额为负，他欠其他人钱
- **balanced（已平衡）**：余额为零

### 虚拟成员处理

- 虚拟成员参与所有计算
- 虚拟成员的结算通过其创建者（通常是管理员）处理
- 导出报表时会标注虚拟成员

## 错误处理

| 错误码 | 说明 |
|--------|------|
| 400 | 参数错误或结算金额不匹配 |
| 401 | 未授权访问 |
| 403 | 无权限操作 |
| 404 | 行程或结算记录不存在 |
| 409 | 结算冲突（余额不平衡） |

## 示例代码

### JavaScript/TypeScript

```typescript
// 获取统计数据
const getStatistics = async (tripId: string) => {
  const response = await fetch(
    `${API_BASE_URL}/trips/${tripId}/statistics`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  )
  return response.json()
}

// 计算结算方案
const calculateSettlement = async (tripId: string) => {
  const response = await fetch(
    `${API_BASE_URL}/trips/${tripId}/calculate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        strategy: 'admin-centric'
      })
    }
  )
  return response.json()
}

// 执行结算
const executeSettlement = async (tripId: string, settlements: any[]) => {
  const response = await fetch(
    `${API_BASE_URL}/trips/${tripId}/settle`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        settlements,
        note: '月度结算'
      })
    }
  )
  return response.json()
}
```

---
*最后更新: 2025-09-04*  
*版本: v1.9.0*