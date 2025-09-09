# TripSum v2.0.0 测试指南

## 测试环境准备

### 1. 安装依赖
```bash
cd backend
npm install --save-dev supertest @types/supertest
```

### 2. 数据库配置
测试使用开发环境的 `.env` 文件配置，确保数据库连接正常。

⚠️ **注意**：测试会清理数据库中的测试数据，请确保不在生产环境运行测试。

## 运行测试

### 运行所有测试
```bash
npm test
```

### 运行特定测试文件
```bash
# 邀请系统测试
npm test -- tests/integration/invitation.test.ts

# 消息系统测试
npm test -- tests/integration/message.test.ts

# 权限控制测试
npm test -- tests/integration/permission.test.ts
```

### 运行测试并生成覆盖率报告
```bash
npm test -- --coverage
```

### 监听模式（开发时使用）
```bash
npm test -- --watch
```

## 测试结构

```
tests/
├── setup.ts                 # 测试环境配置
├── factories/              # 测试数据工厂
│   ├── index.ts
│   ├── user.factory.ts
│   ├── invitation.factory.ts
│   └── message.factory.ts
├── integration/            # 集成测试
│   ├── invitation.test.ts  # 邀请系统测试
│   ├── message.test.ts     # 消息系统测试
│   └── permission.test.ts  # 权限控制测试
└── unit/                   # 单元测试（已有）
    ├── calculation.service.test.ts
    └── ...
```

## 测试覆盖范围

### 功能测试 ✅
- **邀请系统**
  - 用户搜索
  - 发送邀请（ADD/REPLACE模式）
  - 接受/拒绝邀请
  - 邀请过期处理
  - 重复邀请防护

- **消息系统**
  - 消息CRUD操作
  - 批量操作（批量已读/删除）
  - 消息过滤（状态、类型）
  - 消息偏好设置
  - 消息优先级处理
  - 消息聚合

- **权限控制**
  - 管理员独占功能
  - 成员访问控制
  - 非成员限制
  - Token验证
  - 行程所有权

### 性能测试 🚧
需要额外配置：
- 使用 Artillery 进行负载测试
- 使用 clinic.js 进行性能分析

### 安全测试 🚧
需要额外工具：
- OWASP ZAP 自动化扫描
- SQL注入测试
- XSS防护测试

## 测试数据管理

### 测试数据工厂
使用工厂模式创建测试数据：

```typescript
const factories = new TestFactories(prisma)

// 创建测试用户
const user = await factories.user.create({
  username: 'test_user',
  email: 'test@example.com'
})

// 创建带行程的用户
const { user, trip } = await factories.user.createWithTrip()

// 批量创建消息
const messages = await factories.message.createBatch(10, userId)

// 清理所有测试数据
await factories.cleanupAll()
```

### 数据清理
- 每个测试套件执行前后自动清理
- 测试数据使用特定前缀（test_）便于识别
- 测试完成后断开数据库连接

## Mock 配置

测试环境自动 Mock 以下服务：
- **Redis**: 内存模拟，无需实际 Redis 服务
- **Bull Queue**: 同步执行，无需队列服务
- **Socket.io**: 模拟 WebSocket 连接
- **OpenAI API**: 可配置 mock 响应

## 常见问题

### 1. 测试超时
默认超时时间为 30 秒，可在 `setup.ts` 中调整：
```typescript
jest.setTimeout(60000) // 60秒
```

### 2. 数据库连接错误
确保 `.env` 文件中的 `DATABASE_URL` 配置正确，数据库服务正在运行。

### 3. Mock 不生效
确保在 `setup.ts` 中正确配置了 mock，并且测试文件引入了 setup。

### 4. 测试数据污染
如果测试数据相互影响，检查是否正确使用了 `beforeAll/afterAll` 清理数据。

## 测试报告

### 覆盖率目标
- 整体覆盖率：> 80%
- 关键路径覆盖率：100%
- 分支覆盖率：> 70%

### 查看覆盖率报告
```bash
npm test -- --coverage
# 报告生成在 coverage/ 目录
# 打开 coverage/lcov-report/index.html 查看详细报告
```

## 持续集成

建议在 CI/CD 管道中添加以下步骤：
1. 安装依赖
2. 运行 lint 检查
3. 运行单元测试
4. 运行集成测试
5. 生成覆盖率报告
6. 上传覆盖率到 Codecov/Coveralls

## 下一步计划

1. **性能测试**
   - 配置 Artillery 负载测试
   - 添加性能基准测试

2. **安全测试**
   - 集成 OWASP ZAP
   - 添加渗透测试用例

3. **E2E 测试**
   - 使用 Playwright/Cypress
   - 测试完整用户流程

---

*最后更新: 2025-09-09*  
*测试框架: Jest + Supertest*  
*版本: v2.0.0-beta.8*