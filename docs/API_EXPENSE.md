# 支出管理接口文档

## 概述

支出管理模块提供费用记录、查询、更新和删除功能。支持文件上传、参与者分摊、基金池支付识别等特性。所有金额计算使用Decimal.js确保精度。

## 接口列表

### 1. 添加支出

记录新的支出项目，支持上传凭证图片。

**POST** `/trips/:id/expenses`

#### 请求头

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 行程ID |

#### 表单字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| amount | number | 是 | 支出金额 |
| categoryId | string | 否 | 类别ID |
| payerId | string | 是 | 付款人memberId |
| description | string | 否 | 支出描述 |
| expenseDate | string | 是 | 支出日期，格式：YYYY-MM-DD |
| receipt | file | 否 | 凭证图片文件 |
| participants | string | 是 | JSON字符串，参与者信息 |
| isPaidFromFund | boolean | 否 | 是否从基金池支付（系统自动判断） |

#### 参与者格式

```json
[
  {
    "tripMemberId": "member-uuid-1",
    "shareAmount": 100
  },
  {
    "tripMemberId": "member-uuid-2",
    "sharePercentage": 50
  }
]
```

- 使用`shareAmount`指定具体金额
- 使用`sharePercentage`指定百分比（0-100）
- 两种方式可以混合使用

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "expense-uuid",
    "tripId": "trip-uuid",
    "amount": 500,
    "categoryId": "category-uuid",
    "payerId": "member-uuid",
    "description": "晚餐-海底捞",
    "expenseDate": "2024-02-26",
    "receiptUrl": "/uploads/receipts/xxx.jpg",
    "isPaidFromFund": false,
    "createdAt": "2024-02-26T18:00:00Z",
    "payer": {
      "id": "member-uuid",
      "username": "张三"
    },
    "category": {
      "id": "category-uuid",
      "name": "餐饮",
      "icon": "🍽️"
    },
    "participants": [
      {
        "id": "participant-uuid-1",
        "tripMemberId": "member-uuid-1",
        "shareAmount": 100,
        "member": {
          "username": "张三"
        }
      }
    ]
  }
}
```

### 2. 获取支出列表

获取行程的支出记录列表，支持分页和筛选。

**GET** `/trips/:id/expenses`

#### 请求头

```
Authorization: Bearer <token>
```

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认20 |
| startDate | string | 否 | 开始日期 |
| endDate | string | 否 | 结束日期 |
| categoryId | string | 否 | 类别ID |
| payerId | string | 否 | 付款人memberId |
| isPaidFromFund | boolean | 否 | 是否基金池支付 |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "expenses": [
      {
        "id": "expense-uuid-1",
        "amount": 200,
        "category": {
          "id": "category-uuid",
          "name": "餐饮",
          "icon": "🍽️",
          "color": "#FF6B6B"
        },
        "payer": {
          "id": "member-uuid",
          "username": "张三",
          "avatarUrl": "https://example.com/avatar.jpg"
        },
        "description": "午餐",
        "expenseDate": "2024-02-26",
        "receiptUrl": "/uploads/receipts/xxx.jpg",
        "isPaidFromFund": true,
        "participants": [
          {
            "tripMemberId": "member-uuid-1",
            "username": "张三",
            "shareAmount": 50
          },
          {
            "tripMemberId": "member-uuid-2",
            "displayName": "李四",
            "shareAmount": 50
          }
        ],
        "createdAt": "2024-02-26T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    },
    "summary": {
      "totalAmount": 10000,
      "fundExpenses": 6000,
      "personalExpenses": 4000
    }
  }
}
```

### 3. 获取支出详情

获取单个支出的详细信息。

**GET** `/expenses/:id`

#### 请求头

```
Authorization: Bearer <token>
```

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 支出ID |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "expense-uuid",
    "tripId": "trip-uuid",
    "amount": 500,
    "categoryId": "category-uuid",
    "payerId": "member-uuid",
    "description": "晚餐-海底捞",
    "expenseDate": "2024-02-26",
    "receiptUrl": "/uploads/receipts/xxx.jpg",
    "isPaidFromFund": false,
    "createdAt": "2024-02-26T18:00:00Z",
    "updatedAt": "2024-02-26T18:00:00Z",
    "payer": {
      "id": "member-uuid",
      "username": "张三",
      "isVirtual": false
    },
    "category": {
      "id": "category-uuid",
      "name": "餐饮",
      "icon": "🍽️",
      "color": "#FF6B6B"
    },
    "participants": [
      {
        "id": "participant-uuid-1",
        "tripMemberId": "member-uuid-1",
        "shareAmount": 166.67,
        "sharePercentage": 33.33,
        "member": {
          "id": "member-uuid-1",
          "username": "张三",
          "isVirtual": false
        }
      },
      {
        "id": "participant-uuid-2",
        "tripMemberId": "member-uuid-2",
        "shareAmount": 166.67,
        "sharePercentage": 33.33,
        "member": {
          "id": "member-uuid-2",
          "displayName": "李四",
          "isVirtual": true
        }
      }
    ],
    "trip": {
      "id": "trip-uuid",
      "name": "北京五日游",
      "currency": "CNY"
    }
  }
}
```

### 4. 更新支出

更新已有支出的信息。

**PUT** `/expenses/:id`

#### 请求头

```
Authorization: Bearer <token>
Content-Type: application/json
```

#### 请求体

```json
{
  "amount": 250,
  "description": "晚餐-更新",
  "categoryId": "new-category-uuid",
  "participants": [
    {
      "tripMemberId": "member-uuid-1",
      "shareAmount": 125
    },
    {
      "tripMemberId": "member-uuid-2",
      "shareAmount": 125
    }
  ]
}
```

#### 参数说明

所有字段都是可选的，只需提供要更新的字段。

### 5. 删除支出

删除指定的支出记录。

**DELETE** `/expenses/:id`

#### 请求头

```
Authorization: Bearer <token>
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "message": "支出已删除"
  }
}
```


## 使用说明

### 基金池支付识别

系统会自动识别支出是否从基金池支付：
- 当付款人（payerId）是管理员时，默认从基金池支付
- 当付款人是普通成员时，标记为个人垫付，需要报销
- `isPaidFromFund`字段会自动设置，无需手动指定

### 参与者分摊规则

1. **固定金额分摊**：使用`shareAmount`指定每个参与者的具体金额
2. **百分比分摊**：使用`sharePercentage`指定百分比（0-100）
3. **混合分摊**：可以同时使用固定金额和百分比
4. **默认均摊**：如果不指定分摊方式，默认所有参与者均摊

### 金额精度处理

- 所有金额计算使用Decimal.js库确保精度
- API返回的金额为数字类型，精确到小数点后两位
- 前端接收后应使用Decimal.js处理，避免JavaScript浮点数精度问题

### 文件上传限制

- 支持的图片格式：JPG、PNG、GIF、WebP
- 最大文件大小：5MB
- 文件保存路径：`/uploads/receipts/`
- 文件名格式：`{timestamp}-{random}.{ext}`

## 错误处理

| 错误码 | 说明 |
|--------|------|
| 400 | 参数错误（金额为负、日期格式错误等） |
| 401 | 未授权访问 |
| 403 | 无权限操作（非行程成员） |
| 404 | 支出或行程不存在 |
| 413 | 上传文件过大 |
| 415 | 不支持的文件类型 |

## 示例代码

### JavaScript/TypeScript

```typescript
// 添加支出（带文件上传）
const addExpense = async (tripId: string, expenseData: any, receipt?: File) => {
  const formData = new FormData()
  formData.append('amount', expenseData.amount)
  formData.append('payerId', expenseData.payerId)
  formData.append('description', expenseData.description)
  formData.append('expenseDate', expenseData.expenseDate)
  formData.append('participants', JSON.stringify(expenseData.participants))
  
  if (receipt) {
    formData.append('receipt', receipt)
  }
  
  const response = await fetch(`${API_BASE_URL}/trips/${tripId}/expenses`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  })
  
  return response.json()
}

// 获取支出列表（带筛选）
const getExpenses = async (tripId: string, filters?: any) => {
  const params = new URLSearchParams(filters)
  const response = await fetch(
    `${API_BASE_URL}/trips/${tripId}/expenses?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  )
  
  return response.json()
}
```

---
*最后更新: 2025-09-04*  
*版本: v1.9.0*