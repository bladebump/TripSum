# TripSum 待办事项清单

## 📋 当前待办任务

### 🏗️ userId架构优化 (优先级: 中)
- [ ] **基于userId_usage_report.md的优化**
  - 继续淡化userId在业务逻辑中的使用
  - 保留必要的认证相关userId
  - 优化服务层，统一使用memberId
  - 更新API文档，明确参数使用规范

### ✅ API文档重构 (已完成: 2025-09-04)
- [x] **拆分和重构API文档**
  - 将docs/API.md按功能模块拆分（认证、行程、支出、统计、AI）
  - 同步v1.5.0架构变更（memberId优先、管理员中心化结算）
  - 更新所有接口响应示例，反映最新数据结构
  - 添加基金池模式的详细说明和示例
  - 标记已废弃的接口和参数
  
- [ ] **数据访问层优化**
  - 创建统一的成员访问接口
  - 封装userId到memberId的转换逻辑
  - 减少直接的userId查询

### 🧪 E2E测试 (优先级: 中)
- [ ] **端到端测试套件**
  - 完整用户流程测试（注册→创建行程→记账→结算）
  - 多用户协作场景测试
  - 错误恢复测试
  
- [ ] **性能测试**
  - API响应时间测试
  - 并发用户压力测试
  - 大数据量场景测试

### 🎨 用户体验改进 (优先级: 中)
- [ ] **加载状态优化**
  - 展开支出详情时显示加载动画
  - 展开成员详情时显示加载动画
  - 统计数据加载时的骨架屏
  
- [ ] **错误处理完善**
  - 统计API失败时显示友好提示
  - 添加重试机制
  - 离线状态处理
  
- [ ] **交互优化**
  - 添加撤销/重做功能
  - 批量操作支持
  - 快捷键支持

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

### 下一版本计划 (v1.9.0)  
- 📚 API文档重构 - 按功能模块拆分
- 🏗️ userId架构优化 - 完全迁移到memberId
- 🧪 E2E测试套件完善
- 📱 移动端样式优化

### 长期规划
- 🌍 多语言支持
- 📱 原生移动应用
- 🔗 第三方支付集成
- 📈 投资理财功能
- 🎯 目标储蓄计划

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

---
*最后更新: 2025-09-04*  
*当前版本: v1.9.0*  
*主要更新: API文档模块化重构，拆分为6个独立文档*  
*下次工作重点: userId架构优化，E2E测试套件完善*