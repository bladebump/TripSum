# 消息系统 API 文档

## 概述

消息系统提供完整的通知管理功能，包括系统消息、邀请通知、费用变更通知等。支持实时推送、未读管理、批量操作和用户偏好设置。

## 架构特点

- **消息队列**: 基于Bull + Redis的异步消息处理
- **处理器模式**: 13个专门的消息处理器处理不同类型消息
- **实时推送**: WebSocket实时推送新消息和状态变更
- **缓存优化**: Redis缓存未读计数和最近消息
- **模板系统**: 预定义消息模板确保一致性

## 消息类型

| 类型 | 说明 | 支持操作 |
|------|------|---------|
| SYSTEM | 系统通知 | 查看、标记已读 |
| TRIP_INVITATION | 行程邀请 | 接受、拒绝、查看 |
| EXPENSE_CREATED | 新增费用 | 查看详情 |
| EXPENSE_UPDATED | 费用更新 | 查看变更 |
| EXPENSE_DELETED | 费用删除 | 查看记录 |
| MEMBER_JOINED | 成员加入 | 查看成员 |
| MEMBER_LEFT | 成员离开 | 查看记录 |
| TRIP_UPDATED | 行程更新 | 查看变更 |
| TRIP_DELETED | 行程删除 | 确认知晓 |
| SETTLEMENT_CREATED | 新增结算 | 查看方案 |

## API 接口

### 1. 获取消息列表

获取当前用户的消息列表，支持分页和筛选。

**GET** `/messages`

#### 请求头

```
Authorization: Bearer <token>
```

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认20，最大100 |
| type | string | 否 | 消息类型筛选 |
| isRead | boolean | 否 | 已读状态筛选 |
| startDate | string | 否 | 开始日期（YYYY-MM-DD） |
| endDate | string | 否 | 结束日期（YYYY-MM-DD） |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg-uuid-1",
        "type": "TRIP_INVITATION",
        "title": "行程邀请",
        "content": "张三邀请您加入「北京五日游」",
        "isRead": false,
        "isArchived": false,
        "priority": "HIGH",
        "actions": [
          {
            "type": "accept",
            "label": "接受",
            "url": "/api/invitations/inv-uuid/accept"
          },
          {
            "type": "reject",
            "label": "拒绝",
            "url": "/api/invitations/inv-uuid/reject"
          }
        ],
        "relatedEntity": {
          "type": "invitation",
          "id": "inv-uuid",
          "tripId": "trip-uuid",
          "tripName": "北京五日游"
        },
        "senderId": "user-uuid",
        "sender": {
          "username": "张三",
          "avatarUrl": "https://example.com/avatar.jpg"
        },
        "createdAt": "2025-09-11T10:00:00Z",
        "readAt": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

### 2. 获取消息详情

获取单条消息的详细信息。

**GET** `/messages/:id`

#### 请求头

```
Authorization: Bearer <token>
```

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 消息ID |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "msg-uuid-1",
    "type": "TRIP_INVITATION",
    "title": "行程邀请",
    "content": "张三邀请您加入「北京五日游」",
    "isRead": true,
    "isArchived": false,
    "priority": "HIGH",
    "actions": [],
    "relatedEntity": {
      "type": "invitation",
      "id": "inv-uuid",
      "status": "ACCEPTED"
    },
    "senderId": "user-uuid",
    "sender": {
      "username": "张三",
      "email": "zhangsan@example.com"
    },
    "metadata": {
      "inviteType": "ADD",
      "message": "一起来玩吧！"
    },
    "createdAt": "2025-09-11T10:00:00Z",
    "readAt": "2025-09-11T10:30:00Z"
  }
}
```

### 3. 标记消息已读

将指定消息标记为已读状态。

**PUT** `/messages/:id/read`

#### 请求头

```
Authorization: Bearer <token>
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "message": "消息已标记为已读"
  }
}
```

### 4. 批量标记已读

批量将多条消息标记为已读。

**PUT** `/messages/batch-read`

#### 请求头

```
Authorization: Bearer <token>
```

#### 请求体

```json
{
  "messageIds": ["msg-uuid-1", "msg-uuid-2", "msg-uuid-3"]
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "updated": 3,
    "message": "3条消息已标记为已读"
  }
}
```

### 5. 标记全部已读

将当前用户的所有未读消息标记为已读。

**PUT** `/messages/mark-all-read`

#### 请求头

```
Authorization: Bearer <token>
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "updated": 15,
    "message": "所有消息已标记为已读"
  }
}
```

### 6. 获取未读统计

获取各类型消息的未读数量统计。

**GET** `/messages/unread-stats`

#### 请求头

```
Authorization: Bearer <token>
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "total": 12,
    "byType": {
      "SYSTEM": 2,
      "TRIP_INVITATION": 3,
      "EXPENSE_CREATED": 5,
      "MEMBER_JOINED": 2
    },
    "byPriority": {
      "HIGH": 3,
      "NORMAL": 7,
      "LOW": 2
    }
  }
}
```

### 7. 归档消息

将消息归档（不在主列表显示）。

**PUT** `/messages/:id/archive`

#### 请求头

```
Authorization: Bearer <token>
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "message": "消息已归档"
  }
}
```

### 8. 删除消息

永久删除指定消息。

**DELETE** `/messages/:id`

#### 请求头

```
Authorization: Bearer <token>
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "message": "消息已删除"
  }
}
```

### 9. 批量操作

批量执行消息操作（标记已读、归档、删除）。

**POST** `/messages/batch-operation`

#### 请求头

```
Authorization: Bearer <token>
```

#### 请求体

```json
{
  "messageIds": ["msg-uuid-1", "msg-uuid-2"],
  "operation": "archive"
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| messageIds | string[] | 是 | 消息ID数组 |
| operation | string | 是 | 操作类型：read/archive/delete |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "success": 2,
    "failed": 0,
    "message": "批量操作完成"
  }
}
```

## 消息偏好设置

### 10. 获取消息偏好

获取用户的消息接收偏好设置。

**GET** `/message-preferences`

#### 请求头

```
Authorization: Bearer <token>
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "email": {
      "enabled": true,
      "types": ["TRIP_INVITATION", "SETTLEMENT_CREATED"]
    },
    "push": {
      "enabled": true,
      "types": ["ALL"]
    },
    "inApp": {
      "enabled": true,
      "types": ["ALL"]
    },
    "quietHours": {
      "enabled": true,
      "startTime": "22:00",
      "endTime": "08:00"
    }
  }
}
```

### 11. 更新消息偏好

更新用户的消息接收偏好设置。

**PUT** `/message-preferences`

#### 请求头

```
Authorization: Bearer <token>
```

#### 请求体

```json
{
  "email": {
    "enabled": false
  },
  "push": {
    "enabled": true,
    "types": ["TRIP_INVITATION", "EXPENSE_CREATED"]
  }
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "message": "消息偏好已更新"
  }
}
```

## WebSocket 事件

消息系统通过WebSocket提供实时通知功能。

### 接收事件

```javascript
// 新消息通知
socket.on('new_message', (message) => {
  // message对象包含完整的消息信息
  console.log('收到新消息:', message)
})

// 消息已读通知（其他设备标记）
socket.on('message_read', (messageId) => {
  console.log('消息已在其他设备读取:', messageId)
})

// 未读数更新
socket.on('unread-count', (count) => {
  console.log('未读消息数更新:', count)
})
```

### 发送事件

```javascript
// 获取未读数
socket.emit('get-unread-count', userId)

// 标记消息已读
socket.emit('mark-message-read', {
  userId: 'user-uuid',
  messageId: 'msg-uuid'
})
```

## 消息处理器

系统内置13个消息处理器，自动处理不同类型的消息：

1. **SystemMessageHandler** - 系统通知处理
2. **InvitationMessageHandler** - 邀请消息处理
3. **ExpenseCreatedHandler** - 费用创建通知
4. **ExpenseUpdatedHandler** - 费用更新通知
5. **ExpenseDeletedHandler** - 费用删除通知
6. **MemberJoinedHandler** - 成员加入通知
7. **MemberLeftHandler** - 成员离开通知
8. **MemberRoleChangedHandler** - 角色变更通知
9. **TripUpdatedHandler** - 行程更新通知
10. **TripDeletedHandler** - 行程删除通知
11. **SettlementCreatedHandler** - 结算创建通知
12. **ContributionUpdatedHandler** - 基金缴纳更新通知
13. **ReminderMessageHandler** - 提醒消息处理

## 使用场景

### 场景1：处理行程邀请

```javascript
// 1. 获取未读邀请消息
const response = await fetch('/api/messages?type=TRIP_INVITATION&isRead=false')
const { data } = await response.json()

// 2. 显示邀请详情
const invitation = data.messages[0]
console.log(invitation.content) // "张三邀请您加入「北京五日游」"

// 3. 接受邀请
if (invitation.actions.find(a => a.type === 'accept')) {
  await fetch(`/api/invitations/${invitation.relatedEntity.id}/accept`, {
    method: 'POST'
  })
}

// 4. 消息自动标记为已读
```

### 场景2：批量管理消息

```javascript
// 1. 获取所有未读消息
const unreadMessages = await getMessages({ isRead: false })

// 2. 批量标记为已读
await batchMarkAsRead(unreadMessages.map(m => m.id))

// 3. 批量归档旧消息
const oldMessages = await getMessages({ 
  endDate: '2025-01-01' 
})
await batchOperation({
  messageIds: oldMessages.map(m => m.id),
  operation: 'archive'
})
```

## 注意事项

1. **实时性**: 消息通过WebSocket实时推送，确保用户及时收到通知
2. **幂等性**: 所有消息操作支持幂等，重复调用不会产生副作用
3. **权限**: 用户只能操作自己的消息
4. **缓存**: 未读计数缓存在Redis中，提高查询性能
5. **批量限制**: 批量操作最多支持100条消息
6. **分页限制**: 单页最多返回100条消息

---
*最后更新: 2025-09-11*  
*版本: v2.0.0*