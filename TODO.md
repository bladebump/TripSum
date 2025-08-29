# TripSum 待办事项清单

## 📅 2024-12-29 完成的工作

### ✅ API架构重构
- [x] 整合新的统计API (`/trips/:id/statistics`)
- [x] 前端并行调用基础信息和统计信息API
- [x] 删除后端 `getTripDetail` 中的冗余计算逻辑
- [x] 统一前后端数据结构 (membersFinancialStatus)
- [x] 扩展前端类型定义支持完整统计数据

## 📅 2024-12-28 完成的工作

### ✅ 后端计算架构改进
- [x] 增强支出服务添加参与者摘要信息
- [x] 更新计算服务包含完整基金池计算
- [x] 创建新的余额计算API端点
- [x] 在支出响应中包含参与者详细信息

### ✅ 前端显示优化
- [x] 更新支出列表显示参与者信息
- [x] 实现点击展开查看详细参与者列表
- [x] 添加成员财务详情展开视图
- [x] 将前端计算替换为后端API调用
- [x] 清理冗余的前端计算代码

## 📋 待完成任务

### 🚀 性能优化 (优先级: 高)
- [ ] **Redis缓存层实现**
  - 为 `calculateBalances` 结果添加缓存
  - 为 `getTripStatistics` 结果添加缓存
  - 设置合理的缓存过期时间 (建议: 5分钟)

- [ ] **缓存失效机制**
  - 在创建/更新/删除支出时清理相关缓存
  - 在更新成员信息时清理缓存
  - 在基金缴纳变更时清理缓存

- [ ] **数据库查询优化**
  - 为 `expenses` 表的 `tripId` 和 `expenseDate` 添加复合索引
  - 为 `expense_participants` 表的 `tripMemberId` 添加索引
  - 优化 N+1 查询问题

### 🎨 用户体验改进 (优先级: 中)
- [ ] **加载状态优化**
  - 展开支出详情时显示加载动画
  - 展开成员详情时显示加载动画
  - 统计数据加载时的骨架屏

- [ ] **错误处理完善**
  - 统计API失败时显示友好提示
  - 添加重试机制
  - 离线状态处理

- [ ] **分页和虚拟滚动**
  - 支出列表超过50条时启用虚拟滚动
  - 成员财务详情的分页加载
  - 优化大数据量的渲染性能

### 🧪 测试和质量保证 (优先级: 中)
- [ ] **单元测试**
  - `addParticipantsSummary` 方法的测试用例
  - 余额计算公式的测试
  - 基金池计算逻辑的测试

- [ ] **集成测试**
  - 完整的支出创建到余额更新流程测试
  - 多用户并发操作测试
  - API响应时间测试

### 🔄 实时功能 (优先级: 低)
- [ ] **Socket.io 实时更新**
  - 支出创建/更新时广播参与者摘要
  - 余额变化时实时推送
  - 基金池状态变化通知

### 🐛 已知问题修复
- [ ] 虚拟成员在某些场景下显示为 "undefined"
- [ ] 大金额输入时的精度问题 (使用 Decimal.js)
- [ ] 移动端展开视图的样式优化

## 📝 技术债务
1. **类型定义完善**
   - 为 `participantsSummary` 创建完整的 TypeScript 接口
   - 统一前后端的数据结构定义

2. **代码重构**
   - 抽取重复的参与者计算逻辑
   - 统一错误处理机制
   - 优化组件结构，减少嵌套

3. **文档更新**
   - 更新 API 文档说明新的响应结构
   - 添加架构设计文档
   - 编写开发者指南

## 💡 未来功能建议
- 支出统计图表可视化
- 导出账单为 Excel/PDF
- 多币种支持
- 预算管理功能
- 定期支出模板

## 🔧 开发环境配置提醒
```bash
# 后端启动
cd backend
npm run dev

# 前端启动  
cd frontend
npm run dev

# 数据库迁移
cd backend
npx prisma migrate dev

# 查看 Prisma Studio
npx prisma studio
```

## 📌 重要文件位置
- 后端支出服务: `/backend/src/services/expense.service.ts`
- 后端计算服务: `/backend/src/services/calculation.service.ts`
- 后端行程服务: `/backend/src/services/trip.service.ts`
- 前端支出显示: `/frontend/src/pages/TripDetail.tsx`
- 前端行程Store: `/frontend/src/stores/trip.store.ts`
- 类型定义: `/frontend/src/types/expense.types.ts`, `/frontend/src/types/trip.types.ts`

## 🏗️ 当前架构说明
- **数据获取流程**: TripDetail页面 → trip.store → 并行调用 getTripDetail + getStatistics API
- **统计API**: `/trips/:id/statistics` 返回完整的财务统计、成员状态、基金池信息
- **余额API**: `/trips/:id/balances` 独立的余额计算接口
- **职责分离**: getTripDetail只返回基础信息，统计由独立API提供

---
*最后更新: 2024-12-29*
*下次工作重点: 实现 Redis 缓存层以提升性能*