# TripSum 待办事项清单

## 📋 当前待办任务

### 👥 真实用户邀请系统 (v2.0.0计划 - 优先级: 高)

#### 开发流程与里程碑

**里程碑规划**
- **M1 (Week 1-2)**: 数据库设计和后端基础架构
- **M2 (Week 3-4)**: API开发和测试
- **M3 (Week 5-6)**: 前端界面开发
- **M4 (Week 7)**: 集成测试和Bug修复
- **M5 (Week 8)**: 文档更新和发布准备

#### 功能需求背景
- 当前虚拟成员只是记账对象，没有实际用户对应
- 需要让真实用户能够加入行程，查看自己的账单信息
- 真实用户取代虚拟成员后，获得该虚拟成员的所有历史数据

#### 核心功能设计
- **邀请机制**：管理员直接搜索并邀请真实用户，无需邀请码
  - **用户搜索**：通过用户名/邮箱搜索已注册用户
  - **发送邀请**：选择用户后发送邀请通知
  - **通知系统**：被邀请用户收到系统通知
  - **邀请管理**：用户可在通知中心查看和处理邀请
  
- **邀请类型**：支持两种模式
  - **替换模式**：取代某个虚拟成员，继承其所有数据
  - **新增模式**：作为新成员加入行程，从零开始

- **权限设计**：
  - 管理员（admin）：完全权限，可以记账、修改、删除
  - 普通成员（member）：**暂时只能查看和导出，不能记账**
  - 注：这不是新角色，而是对现有member角色的权限限制

- **邀请流程**：
  1. 管理员搜索目标用户
  2. 选择邀请类型（替换/新增）
  3. 如果是替换，选择要替换的虚拟成员
  4. 发送邀请通知
  5. 用户在通知中心查看邀请详情
  6. 用户选择接受或拒绝
  7. 接受后自动加入行程或替换虚拟成员

#### 实施计划

**第零阶段：项目准备**
- [ ] Git分支管理：
  ```bash
  git checkout -b feature/v2.0.0-invitation-system
  git push -u origin feature/v2.0.0-invitation-system
  ```
- [ ] 更新版本号：
  - backend/package.json: "version": "2.0.0-beta.1"
  - frontend/package.json: "version": "2.0.0-beta.1"
- [ ] 创建v2.0.0专属文档目录：
  - docs/v2.0.0/DESIGN.md - 设计文档
  - docs/v2.0.0/MIGRATION.md - 迁移指南

**第一阶段：数据库设计（后端）**
- [ ] 创建Prisma迁移：
  ```bash
  cd backend
  npx prisma migrate dev --name add_invitation_and_message_system
  ```
- [ ] 创建TripInvitation表：
  ```sql
  - id: 邀请ID
  - tripId: 行程ID  
  - invitedUserId: 被邀请用户ID（必需）
  - inviteType: 邀请类型（'replace' | 'add'）
  - targetMemberId: 目标虚拟成员ID（替换模式时必需，新增模式时为null）
  - status: 邀请状态（'pending' | 'accepted' | 'rejected' | 'expired'）
  - message: 邀请留言（可选）
  - createdBy: 邀请人ID
  - createdAt: 创建时间
  - respondedAt: 响应时间
  - expiresAt: 过期时间
  ```
- [ ] 创建Message表（通用消息系统）：
  ```sql
  - id: 消息ID
  - recipientId: 接收者ID（用户ID）
  - senderId: 发送者ID（用户ID或系统）
  - type: 消息类型（见下方枚举）
  - category: 消息分类（'system' | 'trip' | 'expense' | 'social' | 'notification'）
  - priority: 优先级（'high' | 'normal' | 'low'）
  - title: 消息标题
  - content: 消息内容（纯文本）
  - metadata: 元数据（JSON，存储类型相关的具体数据）
  - actions: 可执行操作（JSON，如[{type: 'accept', label: '接受', url: '/api/...'}]）
  - relatedEntity: 关联实体（JSON，如{type: 'invitation', id: 'xxx'}）
  - status: 消息状态（'unread' | 'read' | 'archived' | 'deleted'）
  - readAt: 阅读时间
  - expiresAt: 过期时间（某些消息需要过期）
  - createdAt: 创建时间
  - updatedAt: 更新时间
  ```
  
- [ ] 创建MessageType枚举（可扩展）：
  ```typescript
  enum MessageType {
    // 行程相关
    TRIP_INVITATION = 'trip_invitation',           // 行程邀请
    TRIP_INVITATION_ACCEPTED = 'trip_invitation_accepted',  // 邀请已接受
    TRIP_INVITATION_REJECTED = 'trip_invitation_rejected',  // 邀请已拒绝
    TRIP_MEMBER_JOINED = 'trip_member_joined',     // 新成员加入
    TRIP_MEMBER_LEFT = 'trip_member_left',         // 成员离开
    TRIP_DELETED = 'trip_deleted',                 // 行程已删除
    
    // 费用相关
    EXPENSE_CREATED = 'expense_created',           // 新增支出
    EXPENSE_UPDATED = 'expense_updated',           // 支出更新
    EXPENSE_DELETED = 'expense_deleted',           // 支出删除
    EXPENSE_MENTIONED = 'expense_mentioned',       // 在支出中被提及
    
    // 结算相关
    SETTLEMENT_REMINDER = 'settlement_reminder',   // 结算提醒
    SETTLEMENT_RECEIVED = 'settlement_received',   // 收到结算款
    SETTLEMENT_CONFIRMED = 'settlement_confirmed', // 结算已确认
    
    // 系统相关
    SYSTEM_ANNOUNCEMENT = 'system_announcement',   // 系统公告
    SYSTEM_MAINTENANCE = 'system_maintenance',     // 维护通知
    FEATURE_UPDATE = 'feature_update',             // 功能更新
    
    // 其他
    CUSTOM = 'custom'                              // 自定义消息
  }
  ```
  
- [ ] 创建MessageTemplate表（消息模板）：
  ```sql
  - id: 模板ID
  - type: 消息类型
  - locale: 语言（'zh-CN' | 'en-US'）
  - titleTemplate: 标题模板（支持变量，如"{{inviter}}邀请您加入行程"）
  - contentTemplate: 内容模板
  - defaultActions: 默认操作（JSON）
  - isActive: 是否启用
  ```
  
- [ ] 创建MessagePreference表（用户消息偏好）：
  ```sql
  - id: 偏好ID
  - userId: 用户ID
  - messageType: 消息类型
  - channels: 接收渠道（JSON，如['inApp', 'email', 'push']）
  - enabled: 是否启用
  - frequency: 发送频率（'instant' | 'daily' | 'weekly'）
  ```
- [ ] 更新权限逻辑（不需要新角色）：
  - 保持现有role字段（admin/member）
  - 修改业务逻辑：非管理员暂时不能记账

**第二阶段：API开发（后端）**  

***创建文件结构***
- [ ] 后端新增文件：
  ```
  backend/src/
  ├── controllers/
  │   ├── invitation.controller.ts
  │   ├── message.controller.ts
  │   └── user.controller.ts (搜索功能)
  ├── services/
  │   ├── invitation.service.ts
  │   ├── message.service.ts
  │   └── notification.service.ts
  ├── routes/
  │   ├── invitation.routes.ts
  │   └── message.routes.ts
  ├── validators/
  │   ├── invitation.validator.ts
  │   └── message.validator.ts
  ├── types/
  │   ├── message.types.ts
  │   └── invitation.types.ts
  └── utils/
      └── messageQueue.ts
  ```

***用户搜索API***
- [ ] GET /api/users/search - 搜索用户
  - 参数：query（用户名或邮箱）
  - 返回：匹配的用户列表（id、username、email、avatar）
  - 权限：需要登录

***邀请管理API***
- [ ] POST /api/trips/:id/invitations - 发送邀请
  - 参数：
    - invitedUserId: 被邀请用户ID（必需）
    - inviteType: 'replace' | 'add'（必需）
    - targetMemberId: 虚拟成员ID（替换模式时必需）
    - message: 邀请留言（可选）
  - 操作：创建邀请记录，发送通知
  - 权限：仅管理员

- [ ] GET /api/invitations - 获取我的邀请列表
  - 返回：用户收到的所有邀请（含行程信息、邀请人信息）
  - 筛选：status（pending/accepted/rejected）
  - 权限：当前用户

- [ ] GET /api/invitations/:id - 获取邀请详情
  - 返回：完整邀请信息、行程详情、虚拟成员信息（如果是替换）
  - 权限：邀请接收者或发送者

- [ ] POST /api/invitations/:id/accept - 接受邀请
  - 验证：邀请有效性、用户是否已在行程中
  - 操作：
    - 替换模式：更新虚拟成员的userId和isVirtual字段
    - 新增模式：创建新的TripMember记录
    - 更新邀请状态，发送通知给邀请人
  - 权限：邀请接收者

- [ ] POST /api/invitations/:id/reject - 拒绝邀请
  - 操作：更新邀请状态，发送通知给邀请人
  - 权限：邀请接收者

- [ ] DELETE /api/invitations/:id - 撤销邀请
  - 操作：将邀请状态设为已撤销
  - 权限：邀请发送者（管理员）

***消息系统API***
- [ ] GET /api/messages - 获取消息列表
  - 参数：
    - status: 消息状态筛选（unread/read/archived）
    - category: 消息分类筛选
    - type: 消息类型筛选
    - priority: 优先级筛选
    - page/limit: 分页参数
  - 返回：消息列表（含发送者信息、关联实体）
  - 权限：当前用户

- [ ] GET /api/messages/:id - 获取消息详情
  - 返回：完整消息信息、可执行操作
  - 自动标记为已读
  - 权限：消息接收者

- [ ] PUT /api/messages/:id/read - 标记已读
  - 权限：消息接收者

- [ ] PUT /api/messages/batch-read - 批量标记已读
  - 参数：messageIds数组
  - 权限：消息接收者

- [ ] PUT /api/messages/:id/archive - 归档消息
  - 权限：消息接收者

- [ ] DELETE /api/messages/:id - 删除消息
  - 软删除，status改为deleted
  - 权限：消息接收者

- [ ] GET /api/messages/unread-stats - 获取未读统计
  - 返回：总未读数、分类未读数
  - 权限：当前用户

- [ ] POST /api/messages/:id/actions/:actionType - 执行消息操作
  - 根据消息的actions定义执行相应操作
  - 如接受/拒绝邀请
  - 权限：消息接收者

***消息偏好API***
- [ ] GET /api/message-preferences - 获取消息偏好设置
  - 权限：当前用户

- [ ] PUT /api/message-preferences - 更新消息偏好
  - 批量更新各类消息的接收设置
  - 权限：当前用户

**第三阶段：权限控制更新（后端）**
- [ ] 创建权限中间件：
  ```bash
  backend/src/middleware/permission.middleware.ts
  ```
- [ ] 修改现有权限逻辑：
  ```typescript
  // 暂时限制：只有管理员可以记账
  const permissions = {
    'expense.create': ['admin'],  // 原本是 ['admin', 'member']
    'expense.update': ['admin'],  // 原本是 ['admin', 'member']
    'expense.delete': ['admin'],
    'expense.view': ['admin', 'member'],
    'trip.export': ['admin', 'member'],
    'member.manage': ['admin'],
  }
  ```
- [ ] 更新expense相关API，限制非管理员的创建和修改权限

**第四阶段：前端界面开发**

***创建文件结构***
- [ ] 前端新增文件：
  ```
  frontend/src/
  ├── pages/
  │   ├── InviteMember.tsx
  │   ├── MessageCenter.tsx
  │   ├── MessageDetail.tsx
  │   └── MessagePreferences.tsx
  ├── components/
  │   ├── message/
  │   │   ├── MessageCard.tsx
  │   │   ├── MessageList.tsx
  │   │   ├── MessageBadge.tsx
  │   │   └── MessageActions.tsx
  │   └── invitation/
  │       ├── UserSearch.tsx
  │       ├── InvitationForm.tsx
  │       └── InvitationCard.tsx
  ├── services/
  │   ├── message.service.ts
  │   └── invitation.service.ts
  ├── stores/
  │   └── message.store.ts
  └── types/
      ├── message.types.ts
      └── invitation.types.ts
  ```

***邀请发送界面***
- [ ] 创建InviteMember.tsx邀请组件：
  - 用户搜索框（实时搜索，防抖）
  - 搜索结果列表（显示头像、用户名、邮箱）
  - 邀请类型选择（替换虚拟成员/新增成员）
  - 替换模式：显示虚拟成员列表供选择
  - 新增模式：直接发送邀请
  - 邀请留言输入框（可选）
  - 发送邀请按钮

***消息中心***  
- [ ] 创建MessageCenter.tsx消息中心页面：
  - 消息分类Tab（全部/系统/行程/费用/未读）
  - 消息列表组件：
    - 根据消息类型显示不同图标
    - 优先级标识（高优先级置顶）
    - 未读/已读状态区分
    - 时间显示（刚刚/N分钟前/昨天/具体日期）
  - 批量操作：
    - 全部标记已读
    - 批量归档
    - 批量删除
  - 消息卡片设计：
    - 根据type渲染不同样式
    - 显示发送者信息
    - 显示操作按钮（如有）
    - 支持展开查看详情
  
- [ ] 创建MessageDetail.tsx消息详情组件：
  - 根据消息类型渲染不同内容
  - 邀请类消息：显示行程信息、邀请详情
  - 费用类消息：显示相关支出信息
  - 系统类消息：显示公告内容
  - 执行操作按钮（基于actions字段）
  
- [ ] 创建MessagePreferences.tsx消息偏好设置：
  - 按消息类型设置接收偏好
  - 选择接收渠道（站内/邮件/推送）
  - 设置接收频率
  - 免打扰时间段设置
  
***UI入口优化***
- [ ] 在顶部导航栏添加消息图标：
  - 显示未读数量（区分高优先级）
  - 悬浮显示最新消息预览
  - 点击进入消息中心
  
- [ ] 在TripDetail页面添加邀请入口（管理员可见）：
  - 虚拟成员卡片上的"邀请替换"按钮
  - 页面底部的"邀请新成员"按钮
  
- [ ] 在个人中心添加"我的邀请"入口：
  - 查看待处理的邀请
  - 查看历史邀请记录

**第五阶段：UI权限控制与WebSocket集成（前端）**

***WebSocket集成***
- [ ] 扩展现有Socket.io连接：
  - 添加消息事件监听
  - 实现消息推送接收
  - 处理连接断开重连
  
- [ ] 消息实时推送事件：
  ```typescript
  // 监听事件
  socket.on('message:new', (message) => {})
  socket.on('message:update', (message) => {})
  socket.on('invitation:received', (invitation) => {})
  socket.on('invitation:accepted', (data) => {})
  ```

***权限控制更新***
- [ ] 更新权限判断逻辑：
  ```typescript
  canCreateExpense(member): boolean // 只有admin返回true
  canEditExpense(member): boolean   // 只有admin返回true
  canDeleteExpense(member): boolean // 只有admin返回true
  canViewExpense(member): boolean   // admin和member都返回true
  canExport(member): boolean        // admin和member都返回true
  ```
- [ ] 对非管理员隐藏所有记账入口：
  - 隐藏"记一笔"按钮
  - 隐藏"AI记账"按钮
  - 隐藏支出编辑和删除按钮
- [ ] 为普通成员显示提示："暂时仅管理员可记账"

**第六阶段：成员管理优化**
- [ ] 替换模式的数据处理：
  - 更新TripMember记录：userId设为真实用户ID，isVirtual改为false
  - 保留所有历史数据（支出、基金、结算等）
  - 更新显示名称为真实用户名
- [ ] 新增模式的数据处理：
  - 创建新的TripMember记录
  - 设置role为'member'，isVirtual为false
  - 初始contribution为0
- [ ] 成员列表区分显示：
  - 真实用户：显示用户名和头像
  - 虚拟成员：显示"虚拟"标签和"邀请替换"按钮

**第七阶段：消息系统架构优化**

***消息服务层设计***
- [ ] 创建MessageService统一消息服务：
  - 消息创建工厂方法（根据类型创建）
  - 消息发送调度器（支持多渠道）
  - 消息模板渲染引擎
  - 消息聚合算法（避免消息轰炸）
  
- [ ] 实现消息队列：
  - 使用Redis/RabbitMQ处理异步消息
  - 支持消息优先级队列
  - 失败重试机制
  - 死信队列处理

***扩展性设计***
- [ ] 插件式消息处理器：
  ```typescript
  interface MessageHandler {
    type: MessageType
    validate(data: any): boolean
    process(message: Message): Promise<void>
    render(message: Message): MessageContent
  }
  ```
  
- [ ] 消息钩子系统：
  - beforeSend: 发送前处理
  - afterSend: 发送后处理
  - onRead: 读取时触发
  - onAction: 操作执行时触发

***安全与性能***
- [ ] 消息安全：
  - 防止消息伪造（签名验证）
  - 敏感信息脱敏
  - 操作权限二次验证
  
- [ ] 性能优化：
  - 消息列表虚拟滚动
  - Redis缓存未读计数
  - 消息内容CDN存储（大消息）
  - WebSocket连接池管理
  
- [ ] 监控与统计：
  - 消息送达率统计
  - 用户活跃度分析
  - 消息类型分布统计
  - 异常消息告警

#### 开发规范与注意事项

**代码规范**
- 所有新代码必须通过ESLint检查
- TypeScript严格模式，无any类型
- 单元测试覆盖率>80%
- API接口必须有Joi验证
- 所有数据库操作使用事务

**Git提交规范**
```bash
# 功能开发
feat(invitation): 添加用户搜索API
feat(message): 实现消息队列处理

# Bug修复
fix(invitation): 修复重复邀请检查

# 文档更新
docs(api): 添加v2.0.0 API文档

# 测试
test(message): 添加消息系统单元测试

# 重构
refactor(permission): 优化权限检查逻辑
```

**分支策略**
- feature/v2.0.0-invitation-system: 主开发分支
- 子功能分支: feature/v2.0.0-{功能名}
- 所有PR需要至少1人review
- 合并前必须通过CI/CD检查

#### 技术要点

***邀请系统***
- **无需邀请码**：直接搜索用户并发送邀请，更加便捷
- **双向确认**：管理员发送邀请，用户主动确认，避免误操作
- **两种邀请模式**：
  - 替换模式：更新操作，保持memberId不变，继承所有数据
  - 新增模式：创建操作，生成新的memberId，从零开始

***通用消息系统***
- **高扩展性**：
  - 使用JSON存储metadata，支持任意消息数据结构
  - 插件式消息处理器，便于添加新消息类型
  - 消息模板系统，支持多语言和自定义
  
- **多渠道支持**：
  - 站内消息（默认）
  - 邮件通知（可选）
  - 推送通知（未来）
  - 短信通知（未来）
  
- **灵活的消息管理**：
  - 消息分类和优先级
  - 批量操作支持
  - 用户偏好设置
  - 消息过期机制
  
- **性能优化**：
  - 消息队列异步处理
  - Redis缓存未读计数
  - 虚拟滚动长列表
  - WebSocket实时推送
  
- **安全可靠**：
  - 消息签名防伪造
  - 权限二次验证
  - 失败重试机制
  - 完整的操作日志

**第八阶段：文档更新**

***API文档更新***
- [ ] 更新API_OVERVIEW.md：
  - 添加v2.0.0版本说明
  - 更新认证和权限部分
  - 添加消息系统概述
  
- [ ] 创建API_MESSAGES.md：
  - 消息系统所有API接口
  - 消息类型和数据结构
  - WebSocket事件文档
  
- [ ] 创建API_INVITATION.md：
  - 邀请系统所有API接口
  - 邀请流程说明
  - 用户搜索接口
  
- [ ] 更新API_TRIP.md：
  - 添加邀请相关接口
  - 更新权限说明

***项目文档更新***
- [ ] 更新README.md：
  - 添加v2.0.0新功能介绍
  - 更新技术栈（消息队列等）
  - 更新部署说明
  
- [ ] 更新CLAUDE.md：
  - 添加消息系统架构说明
  - 更新数据库模型
  - 添加新的开发命令
  - 更新测试说明
  
- [ ] 更新CHANGELOG.md：
  - 记录v2.0.0所有变更
  - 标注Breaking Changes
  - 添加迁移指南链接

**第九阶段：部署与发布**
- [ ] 合并到develop分支：
  ```bash
  git checkout develop
  git merge feature/v2.0.0-invitation-system
  ```
- [ ] 测试环境部署和验证
- [ ] 创建v2.0.0-rc.1候选版本
- [ ] 生产环境灰度发布
- [ ] 合并到main分支并打tag：
  ```bash
  git checkout main
  git merge develop
  git tag -a v2.0.0 -m "Release v2.0.0: User Invitation & Message System"
  git push origin v2.0.0
  ```
- [ ] 更新线上文档和发布说明

#### 测试计划  

***邀请功能测试***
- [ ] 用户搜索功能测试（模糊匹配、防抖）
- [ ] 邀请发送流程测试
- [ ] 替换模式：虚拟成员转换数据完整性测试
- [ ] 替换模式：历史数据继承正确性测试
- [ ] 新增模式：新成员创建和初始化测试
- [ ] 非管理员记账权限限制测试
- [ ] 重复邀请防护测试
- [ ] 并发接受邀请测试
- [ ] 用户已在行程中的验证测试

***消息系统测试***
- [ ] 消息创建和发送测试
- [ ] 各类消息类型渲染测试
- [ ] 消息状态转换测试（未读→已读→归档→删除）
- [ ] 批量操作功能测试
- [ ] 消息过期机制测试
- [ ] 消息操作执行测试（actions）
- [ ] 消息模板渲染测试
- [ ] 未读计数准确性测试
- [ ] 消息分类和筛选测试
- [ ] 消息优先级排序测试

***性能与并发测试***
- [ ] 大量消息列表加载性能
- [ ] WebSocket实时推送延迟测试
- [ ] 并发消息发送测试
- [ ] Redis缓存命中率测试
- [ ] 消息队列处理能力测试

***安全测试***
- [ ] 消息权限验证测试
- [ ] 消息伪造防护测试
- [ ] XSS注入防护测试
- [ ] 敏感信息脱敏测试

### 🚀 性能优化 (优先级: 低)
- [ ] **Redis缓存层实现**
  - 为 `calculateBalances` 结果添加缓存
  - 为 `getTripStatistics` 结果添加缓存
  - 设置合理的缓存过期时间 (建议: 5分钟)
  
- [ ] **数据库查询优化**
  - 为 `expenses` 表的 `tripId` 和 `expenseDate` 添加复合索引
  - 为 `expense_participants` 表的 `tripMemberId` 添加索引
  - 优化 N+1 查询问题
  
- [ ] **分页和虚拟滚动**
  - 支出列表超过50条时启用虚拟滚动
  - 成员财务详情的分页加载
  - 优化大数据量的渲染性能

### 🔄 实时功能 (优先级: 低)
- [ ] **Socket.io 实时更新**
  - 支出创建/更新时广播参与者摘要
  - 余额变化时实时推送
  - 基金池状态变化通知
  - 在线成员状态显示

## 🐛 待解决问题
  
- [ ] **移动端样式优化**
  - 在真实设备上测试展开视图
  - 优化触摸交互体验
  - 适配不同屏幕尺寸

## 💡 未来功能建议

### 下一版本计划 (v1.11.0)  
- 🚀 性能优化 - Redis缓存层实现
- 🔄 实时功能 - Socket.io实时更新
- 📱 移动端样式优化 - 真实设备测试

### v2.0.0 重大更新计划
- 👥 **真实用户邀请系统**
  - 支持两种模式：替换虚拟成员、新增真实成员
  - 直接搜索并邀请用户，无需邀请码
  - 替换模式：继承虚拟成员所有数据
  - 新增模式：作为新成员从零开始
  - 暂时限制非管理员记账权限
  
- 📬 **通用消息系统**
  - 支持多种消息类型（邀请、费用、结算、系统等）
  - 灵活的metadata设计，易于扩展
  - 多渠道消息发送（站内、邮件、推送）
  - 用户消息偏好设置
  - 消息模板和多语言支持
  
- 🔮 **消息系统未来扩展**
  - 评论和@提及功能
  - 费用变更通知
  - 定期账单提醒
  - 结算催促通知
  - 行程活动提醒
  - 数据报告推送

### 长期规划
- 🌍 多语言支持
- 📱 原生移动应用

## 🔧 技术债务

1. **代码重构**
   - 抽取重复的参与者计算逻辑
   - 统一错误处理机制
   - 优化组件结构，减少嵌套
   
2. **文档完善**
   - 更新架构设计文档
   - 编写开发者指南
   - 添加部署文档

3. **测试覆盖**
   - 提高单元测试覆盖率到80%+
   - 添加更多集成测试场景
   - 实现自动化测试流程

## 📌 重要文件位置

- 后端支出服务: `/backend/src/services/expense.service.ts`
- 后端计算服务: `/backend/src/services/calculation.service.ts`
- 后端行程服务: `/backend/src/services/trip.service.ts`
- 后端导出服务: `/backend/src/services/export.service.ts`
- 后端金额工具: `/backend/src/utils/decimal.ts` ⭐ NEW
- 前端支出显示: `/frontend/src/pages/TripDetail.tsx`
- 前端行程Store: `/frontend/src/stores/trip.store.ts`
- 前端导出服务: `/frontend/src/services/export.service.ts`
- 前端金额工具: `/frontend/src/utils/decimal.ts` ⭐ NEW
- 图表组件: `/frontend/src/components/charts/`
- 类型定义: `/frontend/src/types/expense.types.ts`, `/frontend/src/types/trip.types.ts`

## 🏗️ 当前架构说明

- **数据获取流程**: TripDetail页面 → trip.store → 并行调用 getTripDetail + getStatistics API
- **统计API**: `/trips/:id/statistics` 返回完整的财务统计、成员状态、基金池信息
- **余额API**: `/trips/:id/balances` 独立的余额计算接口
- **结算模式**: 管理员中心化结算，所有交易通过管理员节点
- **标识体系**: memberId为主要业务标识，userId仅用于认证
- **金额计算**: 全栈Decimal.js精确计算，避免浮点误差
- **数据访问层**: member.service.ts提供统一的成员访问接口

---
*最后更新: 2025-09-08*  
*当前版本: v1.10.0*  
*完整更新历史请查看: [CHANGELOG.md](../CHANGELOG.md)*
*下次工作重点: v2.0.0 真实用户邀请系统*