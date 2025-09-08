# TripSum 待办事项清单

## 📋 当前待办任务

### 👥 真实用户邀请系统 (v2.0.0 - 优先级: 高)

#### ✅ 已完成阶段
- [x] **第一阶段**：数据库设计 - 完成所有表结构和迁移
- [x] **第二阶段**：后端API开发 - 所有接口已实现
- [x] **第三阶段**：权限控制 - 路由级权限中间件已配置

详细实现记录请查看：[V2_IMPLEMENTATION_NOTES.md](./V2_IMPLEMENTATION_NOTES.md)

#### ✅ 已完成阶段（续）
- [x] **第四阶段**：前端UI开发 - 完整实现邀请系统和消息系统前端界面（2025-09-08完成）
  - [x] 类型定义文件（message.types.ts, invitation.types.ts）
  - [x] API服务层（user, invitation, message, socket服务）
  - [x] 消息状态管理store
  - [x] 个人中心页面Profile
  - [x] 消息中心核心功能（MessageCenter, MessageCard, MessageBadge）
  - [x] 邀请系统前端界面（UserSearch, InvitationForm, InvitationCard）
  - [x] 邀请相关页面（InviteMember, InvitationList）
  - [x] 消息系统扩展（MessageDetail, MessagePreferences）
  - [x] UI入口优化（TripDetail邀请入口，TripList消息图标）
  - [x] 路由配置完善

详细实现记录请查看：[V2_IMPLEMENTATION_NOTES.md](./V2_IMPLEMENTATION_NOTES.md)

#### 🚧 待完成阶段

**第五阶段：WebSocket集成（前端）**

***WebSocket集成***
- [ ] 在App组件初始化Socket连接：
  - 用户登录后自动连接
  - 监听消息事件
  - 更新未读数状态
  - 处理断线重连

**第六阶段：前端权限控制**

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

**第七阶段：成员管理优化**
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

**第八阶段：消息系统架构优化**

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

**第九阶段：文档更新**

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

**第十阶段：部署与发布**
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