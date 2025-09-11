# TripSum API 总览

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **认证方式**: Bearer Token (JWT)
- **请求格式**: JSON
- **响应格式**: JSON
- **API版本**: v2.0.0 (2025-09-11)
- **架构特性**: memberId为主、管理员中心化结算、真实用户邀请系统、消息通知体系

## API文档结构

本项目的API文档按功能模块拆分为以下几个部分：

- [API_AUTH.md](./API_AUTH.md) - 认证相关接口
- [API_TRIP.md](./API_TRIP.md) - 行程管理接口
- [API_EXPENSE.md](./API_EXPENSE.md) - 支出管理接口
- [API_STATISTICS.md](./API_STATISTICS.md) - 统计和结算接口
- [API_AI.md](./API_AI.md) - AI功能接口
- [API_MESSAGES.md](./API_MESSAGES.md) - 消息系统接口 (v2.0.0新增)
- [API_INVITATION.md](./API_INVITATION.md) - 邀请系统接口 (v2.0.0新增)

## 通用响应格式

### 成功响应

```json
{
  "success": true,
  "data": {},
  "timestamp": 1708934400000
}
```

### 错误响应

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

## 错误代码

| 代码 | 描述 |
|------|------|
| 400 | 请求参数错误 |
| 401 | 未授权，需要登录 |
| 403 | 禁止访问，权限不足 |
| 404 | 资源未找到 |
| 409 | 冲突，资源已存在 |
| 422 | 无法处理的实体 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

## 限流策略

- 普通API: 100次/分钟
- AI API: 20次/分钟
- 文件上传: 10次/分钟

超出限制将返回 429 状态码。

## WebSocket 事件

### 连接

```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'jwt_token'
  }
})
```

### 身份认证

```javascript
socket.emit('auth', userId)
```

### 房间管理

```javascript
// 加入行程房间
socket.emit('join-trip', tripId)

// 离开行程房间
socket.emit('leave-trip', tripId)

// 加入用户房间（接收个人消息）
socket.emit('join-user', userId)
```

### 监听事件

#### 消息相关事件
```javascript
// 新消息通知
socket.on('new_message', (message) => {
  console.log('收到新消息:', message)
})

// 消息已读通知
socket.on('message_read', (messageId) => {
  console.log('消息已读:', messageId)
})

// 未读数更新
socket.on('unread-count', (count) => {
  console.log('未读消息数:', count)
})
```

#### 邀请相关事件
```javascript
// 收到邀请通知
socket.on('invitation_received', (invitation) => {
  console.log('收到新邀请:', invitation)
})

// 邀请被接受
socket.on('invitation_accepted', (data) => {
  console.log('邀请已被接受:', data)
})

// 邀请被拒绝
socket.on('invitation_rejected', (invitationId) => {
  console.log('邀请已被拒绝:', invitationId)
})
```

#### 行程相关事件
```javascript
// 支出更新
socket.on('expense-created', (expense) => {
  console.log('新支出:', expense)
})

socket.on('expense-updated', (expense) => {
  console.log('支出已更新:', expense)
})

socket.on('expense-deleted', (data) => {
  console.log('支出已删除:', data.expenseId)
})

// 成员变化
socket.on('member-added', (member) => {
  console.log('新成员加入:', member)
})

socket.on('member-removed', (member) => {
  console.log('成员已移除:', member)
})

socket.on('member-role-updated', (member) => {
  console.log('成员角色更新:', member)
})

// 基金缴纳更新
socket.on('member-contribution-updated', (data) => {
  console.log('成员基金缴纳更新:', data)
})

// 结算通知
socket.on('settlement-created', (data) => {
  console.log('新的结算:', data)
})
```

## 架构说明

### 标识体系

#### 核心概念
- **memberId (TripMember.id)**: 主要业务标识，所有成员相关操作使用
- **userId**: 仅用于JWT认证和关联用户账户
- **虚拟成员**: 拥有memberId但userId为null

#### 使用原则（v1.10.0更新）
1. **认证层**：使用userId
   - JWT token载荷中的用户标识
   - 登录、注册等认证操作
   - 权限验证（checkTripPermission）

2. **业务层**：使用memberId  
   - 所有费用相关操作（创建、更新、删除）
   - 成员管理（角色更新、移除成员）
   - 余额计算和结算
   - AI解析中的成员标识

3. **API参数规范**
   - 路径参数：`/trips/:id/members/:memberId` 使用memberId
   - 请求体：`payerId`、`participants[].memberId` 等使用memberId
   - 认证头：Bearer token中包含userId

4. **数据转换**
   - 新增`member.service.ts`提供统一的转换接口
   - `getMemberIdByUserId()`：userId转memberId
   - `checkAndGetMember()`：验证并获取成员信息

### 基金池模式
- **contribution字段**: 记录成员基金缴纳金额
- **智能付款识别**: 管理员付款=基金池支付，其他成员=需报销
- **余额公式**: `balance = contribution + reimbursements - shares`

### 权限管理体系 (v2.0.0新增)
- **角色类型**: admin（管理员）、member（普通成员）
- **管理员专属功能**:
  - 添加/移除成员
  - 发送邀请
  - 更新成员角色
  - 删除行程
  - AI记账功能
  - 批量更新基金缴纳
- **普通成员功能**:
  - 查看行程信息
  - 查看费用记录
  - 查看个人余额
  - 接收邀请通知

### 金额计算
- 所有金额计算使用Decimal.js确保精度
- API响应中的金额字段为数字类型
- 前端接收后应使用Decimal.js处理避免精度问题

## 更新历史

- **v2.0.0** (2025-09-11): 真实用户邀请系统、消息中心、权限管理体系
- **v1.10.0** (2025-09-04): userId架构优化，统一数据访问层
- **v1.9.0** (2025-09-04): API文档模块化重构，接口参数优化
- **v1.8.0** (2025-09-04): Decimal.js集成，金额精度优化  
- **v1.7.0** (2025-09-01): Excel导出功能
- **v1.6.0** (2025-09-01): 代码优化和清理
- **v1.5.0** (2025-08-29): memberId架构优化，管理员中心化结算
- **v1.4.0** (2025-08-20): 基金池模式，虚拟成员完全统一
- **v1.3.0** (2025-08-15): AI计算器集成，Function Calling支持
- **v1.2.0** (2025-08-10): 模块化AI架构，意图识别系统
- **v1.1.0** (2025-08-05): 虚拟成员支持，非注册用户参与
- **v1.0.0** (2025-08-01): 正式版本发布

---
*最后更新: 2025-09-11*  
*版本: v2.0.0*