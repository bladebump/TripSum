# TripSum 测试指南

## 概述
本项目已搭建完整的测试框架，包括后端Jest测试和前端Vitest测试。

## 后端测试

### 安装依赖
```bash
cd backend
npm install
```

### 运行测试
```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm test -- --coverage

# 运行特定测试文件
npm test calculation.service.test

# 监听模式
npm test -- --watch
```

### 测试文件结构
```
backend/
├── jest.config.js           # Jest配置
├── .env.test               # 测试环境变量
├── tests/
│   ├── setup.ts           # 测试设置
│   ├── unit/              # 单元测试
│   │   ├── calculation.service.test.ts  # 计算服务测试
│   │   └── ai.service.test.ts          # AI服务测试
│   └── integration/       # 集成测试
│       └── expense.flow.test.ts        # 支出流程测试
```

### 已实现的测试

#### 单元测试
1. **CalculationService**
   - 余额计算 (基金缴纳 + 垫付 - 分摊)
   - 基金池支付处理
   - 虚拟成员余额计算
   - 债务优化算法
   - 基金池状态计算

2. **AIService**
   - 支出文本解析
   - 基金缴纳识别
   - 成员添加意图
   - 混合意图处理
   - 计算器工具调用

#### 集成测试
1. **Expense Flow**
   - 完整的支出创建到余额更新流程
   - 个人垫付 vs 基金池支付
   - 并发操作测试
   - 错误处理

## 前端测试

### 安装依赖
```bash
cd frontend
npm install
```

### 运行测试
```bash
# 运行所有测试
npm test

# 运行测试UI界面
npm run test:ui

# 生成覆盖率报告
npm run test:coverage

# 监听模式
npm test -- --watch
```

### 测试文件结构
```
frontend/
├── vitest.config.ts        # Vitest配置
├── src/
│   ├── tests/
│   │   └── setup.ts       # 测试设置
│   ├── utils/
│   │   └── __tests__/
│   │       ├── format.test.ts   # 格式化工具测试
│   │       └── member.test.ts   # 成员工具测试
│   └── hooks/
│       └── __tests__/
│           └── useAIChat.test.ts # AI聊天Hook测试
```

### 已实现的测试

#### 工具函数测试
1. **Format Utils**
   - 货币格式化
   - 日期格式化
   - 行程状态判断

2. **Member Utils**
   - 管理员权限判断
   - 成员显示名称获取
   - 成员查找功能

#### Hooks测试
1. **useAIChat**
   - 消息发送与接收
   - 支出解析
   - 基金缴纳处理
   - 成员添加
   - 错误处理

## 测试覆盖率目标

- 单元测试覆盖率: > 80%
- 集成测试覆盖率: > 60%
- 关键业务逻辑: 100%

## 测试最佳实践

1. **测试命名规范**
   - 使用中文描述测试用例
   - 格式: `应该[预期行为]当[条件]`

2. **测试数据**
   - 使用mock数据而非真实数据
   - 每个测试独立，不依赖其他测试

3. **测试范围**
   - 单元测试: 测试单个函数/方法
   - 集成测试: 测试多个模块协作
   - E2E测试: 测试完整用户流程（待实现）

## 持续集成（CI）建议

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: |
          cd backend && npm ci && npm test
          cd ../frontend && npm ci && npm test
```

## 常见问题

### Q: 测试数据库设置
A: 使用`.env.test`配置测试数据库，与开发数据库隔离

### Q: Mock外部服务
A: AI服务、Redis等外部依赖使用Jest/Vitest的mock功能

### Q: 测试失败调试
A: 使用`--verbose`参数查看详细输出，或在IDE中设置断点调试

## 下一步计划

1. [ ] 添加E2E测试 (Playwright/Cypress)
2. [ ] 提高测试覆盖率到90%
3. [ ] 添加性能测试
4. [ ] 集成到CI/CD流程
5. [ ] 添加视觉回归测试

---
*最后更新: 2025-08-29*