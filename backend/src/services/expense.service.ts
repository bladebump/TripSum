// 该文件已拆分为多个模块，现在重新导出拆分后的服务
// 原文件包含了费用管理的所有功能，现已拆分为：
// - expense/types.ts: 类型定义
// - expense/validation.service.ts: 权限和验证逻辑
// - expense/participant.service.ts: 参与者摘要计算
// - expense/crud.service.ts: 创建、更新、删除操作
// - expense/query.service.ts: 查询操作
// - expense/core.service.ts: 核心服务（委托模式）

export { ExpenseService, expenseService } from './expense'