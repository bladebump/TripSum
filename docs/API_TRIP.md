# 行程管理接口文档

## 概述

行程管理模块提供行程的创建、查询、更新、删除以及成员管理功能。支持基金池模式和虚拟成员，采用memberId为主的架构设计。v2.0.0新增真实用户邀请系统和细粒度权限管理。

## 接口列表

### 1. 创建行程

创建新的旅行行程，创建者自动成为管理员。

**POST** `/trips`

#### 请求头

```
Authorization: Bearer <token>
```

#### 请求体

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

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 行程名称，1-50个字符 |
| description | string | 否 | 行程描述，最多500个字符 |
| startDate | string | 是 | 开始日期，格式：YYYY-MM-DD |
| endDate | string | 是 | 结束日期，格式：YYYY-MM-DD |
| initialFund | number | 否 | 初始基金池金额，默认0 |
| currency | string | 否 | 货币类型，默认CNY |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "北京五日游",
    "description": "和朋友们一起去北京旅游",
    "startDate": "2024-02-26",
    "endDate": "2024-03-05",
    "initialFund": 10000,
    "currency": "CNY",
    "createdBy": "user-uuid",
    "createdAt": "2024-02-26T00:00:00Z"
  }
}
```

### 2. 获取用户的所有行程

获取当前用户参与的所有行程列表。

**GET** `/trips`

#### 请求头

```
Authorization: Bearer <token>
```

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认10 |
| status | string | 否 | 状态筛选：active/completed/all，默认all |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "trips": [
      {
        "id": "trip-uuid",
        "name": "北京五日游",
        "description": "和朋友们一起去北京旅游",
        "startDate": "2024-02-26",
        "endDate": "2024-03-05",
        "memberCount": 5,
        "totalExpenses": 5000,
        "fundBalance": 1000,
        "role": "admin",
        "currency": "CNY"
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

### 3. 获取行程详情

获取指定行程的详细信息，包括成员列表和统计数据。

**GET** `/trips/:id`

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
    "id": "trip-uuid",
    "name": "北京五日游",
    "description": "和朋友们一起去北京旅游",
    "startDate": "2024-02-26",
    "endDate": "2024-03-05",
    "initialFund": 10000,
    "currency": "CNY",
    "members": [
      {
        "id": "member-uuid-1",
        "userId": "user-uuid",
        "username": "张三",
        "avatarUrl": "https://example.com/avatar.jpg",
        "role": "admin",
        "joinDate": "2024-02-26T00:00:00Z",
        "contribution": 5000,
        "isVirtual": false
      },
      {
        "id": "member-uuid-2",
        "userId": null,
        "displayName": "李四",
        "role": "member",
        "joinDate": "2024-02-26T00:00:00Z",
        "contribution": 3000,
        "isVirtual": true
      }
    ],
    "statistics": {
      "totalExpenses": 5000,
      "expenseCount": 20,
      "fundPool": {
        "total": 8000,
        "used": 3000,
        "remaining": 5000
      }
    }
  }
}
```

### 4. 更新行程信息

更新行程的基本信息（仅管理员可操作）。

**PUT** `/trips/:id`

#### 请求头

```
Authorization: Bearer <token>
```

#### 请求体

```json
{
  "name": "string",
  "description": "string",
  "endDate": "2024-03-10"
}
```

#### 参数说明

所有参数都是可选的，只需提供要更新的字段。

### 5. 删除行程

删除指定行程（仅管理员可操作）。

**DELETE** `/trips/:id`

#### 请求头

```
Authorization: Bearer <token>
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "message": "行程已删除"
  }
}
```

## 权限管理 (v2.0.0新增)

### 角色说明

| 角色 | 权限 | 说明 |
|------|------|------|
| admin | 完全权限 | 可以执行所有操作 |
| member | 只读权限 | 只能查看信息，不能修改 |

### 管理员专属操作

以下操作仅限管理员执行：
- 更新行程信息
- 删除行程
- 添加/移除成员
- 更新成员角色
- 发送邀请
- 批量更新基金缴纳
- 使用AI记账功能

## 成员管理接口

### 6. 邀请真实用户 (v2.0.0更新)

通过邀请系统添加真实用户。详见[邀请系统API文档](./API_INVITATION.md)。

**说明**: 原`POST /trips/:id/members`接口已废弃，请使用邀请系统。

### 7. 添加真实用户成员（已废弃）

~~邀请已注册用户加入行程。~~

**注意**: 此接口已在v2.0.0中废弃，请使用邀请系统发送邀请。

**POST** `/trips/:id/members`

#### 请求头

```
Authorization: Bearer <token>
```

#### 请求体

```json
{
  "userId": "user-uuid",
  "role": "member"
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID |
| role | string | 否 | 角色：admin/member，默认member |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "member-uuid",
    "tripId": "trip-uuid",
    "userId": "user-uuid",
    "role": "member",
    "joinDate": "2024-02-26T00:00:00Z",
    "contribution": 0,
    "user": {
      "username": "王五",
      "email": "wangwu@example.com"
    }
  }
}
```

### 8. 添加虚拟成员

添加未注册的虚拟成员参与行程。

**POST** `/trips/:id/virtual-members`

#### 请求头

```
Authorization: Bearer <token>
```

#### 请求体

```json
{
  "displayName": "张三"
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| displayName | string | 是 | 显示名称 |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "member-uuid",
    "tripId": "trip-uuid",
    "userId": null,
    "displayName": "张三",
    "isVirtual": true,
    "role": "member",
    "joinDate": "2024-02-26T00:00:00Z",
    "contribution": 0
  }
}
```

### 9. 获取行程成员列表

获取行程的所有成员信息，包括余额计算。

**GET** `/trips/:id/members`

#### 请求头

```
Authorization: Bearer <token>
```

#### 响应示例

```json
{
  "success": true,
  "data": [
    {
      "id": "member-uuid-1",
      "userId": "user-uuid",
      "tripId": "trip-uuid",
      "role": "admin",
      "joinDate": "2024-02-26T00:00:00Z",
      "isActive": true,
      "isVirtual": false,
      "displayName": null,
      "contribution": 5000,
      "user": {
        "id": "user-uuid",
        "username": "张三",
        "email": "zhangsan@example.com",
        "avatarUrl": "https://example.com/avatar.jpg"
      },
      "balance": 1500,
      "totalPaid": 500,
      "totalShares": 4000
    },
    {
      "id": "member-uuid-2",
      "userId": null,
      "tripId": "trip-uuid",
      "role": "member",
      "joinDate": "2024-02-26T00:00:00Z",
      "isActive": true,
      "isVirtual": true,
      "displayName": "李四",
      "contribution": 5000,
      "user": null,
      "balance": 2000,
      "totalPaid": 1000,
      "totalShares": 4000
    }
  ]
}
```

### 10. 更新成员基金缴纳

更新单个成员的基金缴纳金额。

**PUT** `/trips/:id/members/:memberId/contribution`

#### 请求头

```
Authorization: Bearer <token>
```

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 行程ID |
| memberId | string | 成员ID（TripMember.id） |

#### 请求体

```json
{
  "contribution": 1000
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "member-uuid",
    "tripId": "trip-uuid",
    "userId": "user-uuid",
    "contribution": 1000,
    "user": {
      "username": "张三",
      "email": "zhangsan@example.com"
    }
  }
}
```

### 11. 批量更新基金缴纳

批量更新多个成员的基金缴纳金额。

**PATCH** `/trips/:id/contributions`

#### 请求头

```
Authorization: Bearer <token>
```

#### 请求体

```json
{
  "contributions": [
    {
      "memberId": "member-uuid-1",
      "contribution": 1000
    },
    {
      "memberId": "member-uuid-2",
      "contribution": 1500
    }
  ]
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "success": true,
    "updated": 2,
    "members": [
      {
        "id": "member-uuid-1",
        "contribution": 1000,
        "user": {
          "username": "张三"
        }
      },
      {
        "id": "member-uuid-2",
        "contribution": 1500,
        "displayName": "李四"
      }
    ]
  }
}
```

### 12. 更新成员角色

更改成员在行程中的角色（仅管理员可操作）。

**PUT** `/trips/:id/members/:memberId`

#### 请求头

```
Authorization: Bearer <token>
```

#### 请求体

```json
{
  "role": "admin"
}
```

### 13. 移除成员

从行程中移除成员（仅管理员可操作）。

**DELETE** `/trips/:id/members/:memberId`

#### 请求头

```
Authorization: Bearer <token>
```

## 使用场景

### 基金池模式流程

1. 创建行程时设置`initialFund`
2. 使用批量更新接口设置成员的`contribution`
3. 管理员付款时，系统自动识别为基金池支付
4. 非管理员付款时，识别为需要报销的支出
5. 余额计算：`balance = contribution + reimbursements - shares`

### 虚拟成员使用

1. 对于未注册用户，使用虚拟成员接口添加
2. 虚拟成员拥有独立的`memberId`
3. 虚拟成员可正常参与支出分摊和结算
4. 虚拟成员无法登录系统，需通过其他成员代为操作

## 注意事项

- 所有成员相关操作使用`memberId`而非`userId`
- 虚拟成员的`userId`为`null`，通过`displayName`识别
- 基金池功能需要正确设置成员的`contribution`字段
- 删除行程会级联删除所有相关数据（成员、支出、结算等）

---
*最后更新: 2025-09-11*  
*版本: v2.0.0*