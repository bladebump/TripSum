# TripSum 待办事项清单

## 🚀 当前任务

### 部署与发布 v2.0.0
- [ ] 合并到main分支并打tag v2.0.0
- [ ] 更新线上文档和发布说明

## 📋 短期优化计划

### 性能优化建议
- [ ] Redis缓存层实现（calculateBalances、getTripStatistics）
- [ ] 数据库查询优化（添加索引、解决N+1问题）
- [ ] 前端虚拟滚动（大列表优化）

### 安全测试（可选）
- [ ] 权限验证测试（绕过前端直接调用API）
- [ ] XSS防护测试（消息内容注入）
- [ ] SQL注入防护验证
- [ ] JWT token安全性测试

## 💡 未来版本规划

### v3.0.0 长期规划
- [ ] 多语言支持
- [ ] 原生移动应用
- [ ] 费用变更通知
- [ ] 定期账单提醒

## 🔧 开发规范

### Git提交规范
```bash
feat(module): 添加新功能
fix(module): 修复bug
docs(module): 文档更新
test(module): 添加测试
refactor(module): 代码重构
```

### 代码质量要求
- TypeScript严格模式，无any类型
- 所有API接口必须有Joi验证
- 数据库操作使用事务
- 单元测试覆盖率>80%

## 📌 重要文件位置

### v2.0.0 核心文件
- **消息队列**: `/backend/src/queues/message.queue.ts`
- **消息处理器**: `/backend/src/services/message/handlers/`
- **消息工厂**: `/backend/src/services/message/factory.service.ts`
- **消息调度器**: `/backend/src/services/message/dispatcher.service.ts`
- **消息缓存**: `/backend/src/services/message/cache.service.ts`
- **邀请服务**: `/backend/src/services/invitation/`
- **权限工具**: `/frontend/src/utils/permission.ts`

### 原有核心文件
- **后端服务**: `/backend/src/services/` (已拆分为模块化结构)
- **前端页面**: `/frontend/src/pages/`
- **前端组件**: `/frontend/src/components/`
- **类型定义**: `/frontend/src/types/`

---
*最后更新: 2025-09-11*  
*当前版本: v2.0.0*  
*下次工作: 部署与发布*