# TripSum 待办事项清单

## 📋 当前待办任务


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
- **数据访问层**: member.service.ts提供统一的成员访问接口

## ✅ 已完成任务历史

### v1.10.0 - userId架构优化 (2025-09-04)
- [x] AI控制器修复，正确获取memberId  
- [x] 创建member.service.ts统一数据访问层
- [x] 明确认证层userId vs 业务层memberId使用原则
- [x] 添加完整的测试覆盖（65个测试用例）

### v1.9.0 - API文档重构 (2025-09-04)
- [x] 将API.md按功能模块拆分为6个独立文档
- [x] 同步架构变更（memberId优先、管理员中心化结算）
- [x] 更新所有接口响应示例

### v1.8.0 - 金额精度优化 (2025-09-04)
- [x] 集成Decimal.js解决浮点数精度问题
- [x] 前后端统一金额处理工具类
- [x] 39个金额计算测试用例全部通过

---
*最后更新: 2025-09-04*  
*当前版本: v1.10.0*  
*主要更新: userId架构优化完成，测试覆盖完善*  
*下次工作重点: 性能优化 - Redis缓存层实现*