# TripSum API 文档

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **认证方式**: Bearer Token (JWT)
- **请求格式**: JSON
- **响应格式**: JSON

### 通用响应格式

```json
{
  "success": true,
  "data": {},
  "timestamp": 1708934400000
}
```

### 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "400",
    "message": "错误描述"
  },
  "timestamp": 1708934400000
}
```

## 认证接口

### 用户注册

**POST** `/auth/register`

请求体:
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "string",
      "email": "string"
    },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### 用户登录

**POST** `/auth/login`

请求体:
```json
{
  "email": "string",
  "password": "string"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "string",
      "email": "string",
      "avatarUrl": "string"
    },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### 刷新Token

**POST** `/auth/refresh`

请求体:
```json
{
  "refreshToken": "string"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token",
    "refreshToken": "new_refresh_token"
  }
}
```

### 获取用户信息

**GET** `/auth/profile`

Headers:
```
Authorization: Bearer <token>
```

响应:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "avatarUrl": "string",
    "createdAt": "2024-02-26T00:00:00Z"
  }
}
```

## 行程管理接口

### 创建行程

**POST** `/trips`

Headers:
```
Authorization: Bearer <token>
```

请求体:
```json
{
  "name": "string",
  "description": "string",
  "startDate": "2024-02-26",
  "endDate": "2024-03-05",
  "initialFund": 10000,
  "currency": "CNY"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "startDate": "2024-02-26",
    "endDate": "2024-03-05",
    "initialFund": 10000,
    "currency": "CNY",
    "createdBy": "uuid",
    "createdAt": "2024-02-26T00:00:00Z"
  }
}
```

### 获取用户的所有行程

**GET** `/trips`

Headers:
```
Authorization: Bearer <token>
```

查询参数:
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 10)
- `status`: active | completed | all (默认: all)

响应:
```json
{
  "success": true,
  "data": {
    "trips": [
      {
        "id": "uuid",
        "name": "string",
        "description": "string",
        "startDate": "2024-02-26",
        "endDate": "2024-03-05",
        "memberCount": 5,
        "totalExpenses": 5000,
        "myBalance": 200
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

### 获取行程详情

**GET** `/trips/:id`

Headers:
```
Authorization: Bearer <token>
```

响应:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "startDate": "2024-02-26",
    "endDate": "2024-03-05",
    "initialFund": 10000,
    "currency": "CNY",
    "members": [
      {
        "id": "uuid",
        "username": "string",
        "avatarUrl": "string",
        "role": "admin",
        "joinDate": "2024-02-26T00:00:00Z"
      }
    ],
    "statistics": {
      "totalExpenses": 5000,
      "expenseCount": 20,
      "averagePerPerson": 1000
    }
  }
}
```

### 更新行程信息

**PUT** `/trips/:id`

Headers:
```
Authorization: Bearer <token>
```

请求体:
```json
{
  "name": "string",
  "description": "string",
  "endDate": "2024-03-10"
}
```

### 删除行程

**DELETE** `/trips/:id`

Headers:
```
Authorization: Bearer <token>
```

## 成员管理接口

### 添加成员

**POST** `/trips/:id/members`

Headers:
```
Authorization: Bearer <token>
```

请求体:
```json
{
  "userId": "uuid",
  "role": "member"
}
```

### 获取行程成员列表

**GET** `/trips/:id/members`

Headers:
```
Authorization: Bearer <token>
```

响应:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "username": "string",
      "email": "string",
      "avatarUrl": "string",
      "role": "admin",
      "joinDate": "2024-02-26T00:00:00Z",
      "totalPaid": 2000,
      "balance": 500
    }
  ]
}
```

### 移除成员

**DELETE** `/trips/:id/members/:userId`

Headers:
```
Authorization: Bearer <token>
```

### 更新成员角色

**PUT** `/trips/:id/members/:userId`

Headers:
```
Authorization: Bearer <token>
```

请求体:
```json
{
  "role": "admin"
}
```

## 支出管理接口

### 添加支出

**POST** `/trips/:id/expenses`

Headers:
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

表单字段:
- `amount`: 金额 (必填)
- `categoryId`: 类别ID (可选)
- `payerId`: 付款人ID (必填)
- `description`: 描述 (可选)
- `expenseDate`: 支出日期 (必填)
- `receipt`: 凭证图片文件 (可选)
- `participants`: JSON数组，参与者信息

参与者格式:
```json
[
  {
    "userId": "uuid",
    "shareAmount": 100
  },
  {
    "userId": "uuid",
    "sharePercentage": 50
  }
]
```

### 获取支出列表

**GET** `/trips/:id/expenses`

Headers:
```
Authorization: Bearer <token>
```

查询参数:
- `page`: 页码
- `limit`: 每页数量
- `startDate`: 开始日期
- `endDate`: 结束日期
- `categoryId`: 类别ID
- `payerId`: 付款人ID

响应:
```json
{
  "success": true,
  "data": {
    "expenses": [
      {
        "id": "uuid",
        "amount": 200,
        "category": {
          "id": "uuid",
          "name": "餐饮",
          "icon": "🍽️",
          "color": "#FF6B6B"
        },
        "payer": {
          "id": "uuid",
          "username": "string",
          "avatarUrl": "string"
        },
        "description": "午餐",
        "expenseDate": "2024-02-26",
        "receiptUrl": "string",
        "participants": [
          {
            "userId": "uuid",
            "username": "string",
            "shareAmount": 50
          }
        ],
        "createdAt": "2024-02-26T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100
    }
  }
}
```

### 获取支出详情

**GET** `/expenses/:id`

Headers:
```
Authorization: Bearer <token>
```

### 更新支出

**PUT** `/expenses/:id`

Headers:
```
Authorization: Bearer <token>
```

请求体:
```json
{
  "amount": 250,
  "description": "晚餐",
  "participants": []
}
```

### 删除支出

**DELETE** `/expenses/:id`

Headers:
```
Authorization: Bearer <token>
```

## 统计与结算接口

### 获取行程统计数据

**GET** `/trips/:id/statistics`

Headers:
```
Authorization: Bearer <token>
```

响应:
```json
{
  "success": true,
  "data": {
    "totalExpenses": 10000,
    "expenseCount": 50,
    "averagePerPerson": 2000,
    "categoryBreakdown": [
      {
        "categoryId": "uuid",
        "categoryName": "餐饮",
        "amount": 5000,
        "percentage": 50
      }
    ],
    "dailyExpenses": [
      {
        "date": "2024-02-26",
        "amount": 1500,
        "count": 5
      }
    ]
  }
}
```

### 获取成员余额信息

**GET** `/trips/:id/balances`

Headers:
```
Authorization: Bearer <token>
```

响应:
```json
{
  "success": true,
  "data": [
    {
      "userId": "uuid",
      "username": "string",
      "totalPaid": 3000,
      "totalShare": 2000,
      "balance": 1000,
      "owesTo": [
        {
          "userId": "uuid",
          "username": "string",
          "amount": 500
        }
      ],
      "owedBy": [
        {
          "userId": "uuid",
          "username": "string",
          "amount": 1500
        }
      ]
    }
  ]
}
```

### 计算结算方案

**POST** `/trips/:id/calculate`

Headers:
```
Authorization: Bearer <token>
```

响应:
```json
{
  "success": true,
  "data": {
    "settlements": [
      {
        "from": {
          "userId": "uuid",
          "username": "string"
        },
        "to": {
          "userId": "uuid",
          "username": "string"
        },
        "amount": 500
      }
    ],
    "summary": {
      "totalTransactions": 3,
      "totalAmount": 1500
    }
  }
}
```

### 执行结算

**POST** `/trips/:id/settle`

Headers:
```
Authorization: Bearer <token>
```

请求体:
```json
{
  "settlements": [
    {
      "fromUserId": "uuid",
      "toUserId": "uuid",
      "amount": 500
    }
  ]
}
```

## AI功能接口

### 解析支出描述

**POST** `/ai/parse-expense`

Headers:
```
Authorization: Bearer <token>
```

请求体:
```json
{
  "tripId": "uuid",
  "description": "昨天晚上吃饭花了300，张三和李四参加，我付的钱"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "amount": 300,
    "participants": [
      {
        "userId": "uuid",
        "username": "张三",
        "shareAmount": 100
      },
      {
        "userId": "uuid",
        "username": "李四",
        "shareAmount": 100
      }
    ],
    "category": "餐饮",
    "confidence": 0.95
  }
}
```

### 智能分类

**POST** `/ai/categorize`

Headers:
```
Authorization: Bearer <token>
```

请求体:
```json
{
  "description": "打车去机场"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "category": "交通",
    "confidence": 0.98
  }
}
```

### 建议分摊方案

**POST** `/ai/suggest-split`

Headers:
```
Authorization: Bearer <token>
```

请求体:
```json
{
  "tripId": "uuid",
  "amount": 500,
  "description": "买了5张门票，张三要两张"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "splitMethod": "custom",
    "participants": [
      {
        "userId": "uuid",
        "username": "张三",
        "shareAmount": 200,
        "reason": "需要两张票"
      },
      {
        "userId": "uuid",
        "username": "李四",
        "shareAmount": 100
      }
    ]
  }
}
```

## WebSocket 事件

### 连接

```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'jwt_token'
  }
})
```

### 加入行程房间

```javascript
socket.emit('join-trip', tripId)
```

### 监听事件

#### 支出更新
```javascript
socket.on('expense-updated', (data) => {
  console.log('支出已更新:', data)
})
```

#### 成员变化
```javascript
socket.on('member-changed', (data) => {
  console.log('成员变化:', data)
})
```

#### 结算通知
```javascript
socket.on('settlement-created', (data) => {
  console.log('新的结算:', data)
})
```

## 错误代码

| 代码 | 描述 |
|------|------|
| 400 | 请求参数错误 |
| 401 | 未授权，需要登录 |
| 403 | 禁止访问，权限不足 |
| 404 | 资源未找到 |
| 409 | 冲突，资源已存在 |
| 422 | 无法处理的实体 |
| 500 | 服务器内部错误 |

## 限流策略

- 普通API: 100次/分钟
- AI API: 20次/分钟
- 文件上传: 10次/分钟

超出限制将返回 429 状态码。