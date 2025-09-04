# 认证接口文档

## 概述

认证模块提供用户注册、登录、Token刷新和用户信息获取等功能。系统使用JWT进行身份验证，支持访问Token和刷新Token的双令牌机制。

## 接口列表

### 1. 用户注册

创建新用户账户。

**POST** `/auth/register`

#### 请求体

```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名，3-50个字符 |
| email | string | 是 | 邮箱地址，需符合邮箱格式 |
| password | string | 是 | 密码，至少6个字符 |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "zhangsan",
      "email": "zhangsan@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 错误响应

- `400` - 参数验证失败（用户名或邮箱格式不正确）
- `409` - 用户名或邮箱已存在

### 2. 用户登录

使用邮箱和密码登录。

**POST** `/auth/login`

#### 请求体

```json
{
  "email": "string",
  "password": "string"
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 是 | 注册时使用的邮箱 |
| password | string | 是 | 用户密码 |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "zhangsan",
      "email": "zhangsan@example.com",
      "avatarUrl": "https://example.com/avatar.jpg"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 错误响应

- `400` - 参数验证失败
- `401` - 邮箱或密码错误
- `404` - 用户不存在

### 3. 刷新Token

使用刷新Token获取新的访问Token。

**POST** `/auth/refresh`

#### 请求体

```json
{
  "refreshToken": "string"
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| refreshToken | string | 是 | 登录时获得的刷新Token |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 错误响应

- `401` - 刷新Token无效或已过期

### 4. 获取用户信息

获取当前登录用户的详细信息。

**GET** `/auth/profile`

#### 请求头

```
Authorization: Bearer <token>
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "zhangsan",
    "email": "zhangsan@example.com",
    "avatarUrl": "https://example.com/avatar.jpg",
    "createdAt": "2024-02-26T00:00:00Z"
  }
}
```

#### 错误响应

- `401` - 未提供Token或Token无效
- `404` - 用户不存在

### 5. 更新用户资料

更新当前用户的个人信息。

**PUT** `/auth/profile`

#### 请求头

```
Authorization: Bearer <token>
```

#### 请求体

```json
{
  "username": "string",
  "avatarUrl": "string"
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 否 | 新用户名 |
| avatarUrl | string | 否 | 头像URL |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "lisi",
    "email": "zhangsan@example.com",
    "avatarUrl": "https://example.com/new-avatar.jpg"
  }
}
```


## Token说明

### Token类型

- **Access Token**: 用于API请求认证，有效期15分钟
- **Refresh Token**: 用于刷新Access Token，有效期7天

### Token使用

1. 登录成功后，保存返回的`token`和`refreshToken`
2. 在需要认证的API请求中，添加请求头：`Authorization: Bearer <token>`
3. 当收到`401`错误时，使用`refreshToken`调用刷新接口获取新Token
4. 刷新Token过期后，需要重新登录

### 安全建议

- 不要在前端明文存储Token
- 建议使用httpOnly Cookie或加密的localStorage
- 定期刷新Token以保持会话安全
- 在用户登出时清除所有Token

## 使用示例

### JavaScript/TypeScript

```typescript
// 登录
const login = async (email: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  })
  
  const data = await response.json()
  if (data.success) {
    // 保存Token
    localStorage.setItem('token', data.data.token)
    localStorage.setItem('refreshToken', data.data.refreshToken)
  }
  return data
}

// 带认证的API请求
const getProfile = async () => {
  const token = localStorage.getItem('token')
  const response = await fetch(`${API_BASE_URL}/auth/profile`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  return response.json()
}

// Token刷新
const refreshToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken')
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refreshToken })
  })
  
  const data = await response.json()
  if (data.success) {
    localStorage.setItem('token', data.data.token)
    localStorage.setItem('refreshToken', data.data.refreshToken)
  }
  return data
}
```

---
*最后更新: 2025-09-04*  
*版本: v1.9.0*