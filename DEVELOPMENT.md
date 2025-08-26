# TripSum 旅算 - 开发文档

## 项目概述

**项目名称**: TripSum (旅算)  
**项目描述**: 一个专为小团体旅行设计的费用分摊应用，帮助朋友间快速记录和结算旅行消费。

### 核心功能
- 创建旅行账本，记录每日消费
- 智能计算每人应付/应收金额
- AI辅助账单分类和归属分析
- 实时同步，多人协作

## 技术架构

### 前端技术栈
- **框架**: React 18 + TypeScript 5
- **UI库**: Ant Design Mobile 5
- **状态管理**: Zustand
- **路由**: React Router v6
- **HTTP客户端**: Axios
- **构建工具**: Vite

### 后端技术栈
- **运行时**: Node.js 20 LTS
- **框架**: Express.js + TypeScript
- **ORM**: Prisma
- **认证**: JWT + bcrypt
- **验证**: Joi
- **日志**: Winston

### 数据库
- **主数据库**: PostgreSQL 15
- **缓存**: Redis 7
- **文件存储**: MinIO (用于存储凭证图片)

### AI集成
- **主模型**: OpenAI GPT-4 / Claude 3
- **用途**: 
  - 自然语言解析账单归属
  - 智能消费分类
  - 费用分摊建议

## 数据库设计

### 1. users (用户表)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. trips (行程表)
```sql
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  initial_fund DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'CNY',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. trip_members (行程成员表)
```sql
CREATE TABLE trip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  role VARCHAR(20) DEFAULT 'member', -- admin, member
  join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(trip_id, user_id)
);
```

### 4. categories (支出类别表)
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(7),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false
);
```

### 5. expenses (支出记录表)
```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  category_id UUID REFERENCES categories(id),
  payer_id UUID REFERENCES users(id),
  description TEXT,
  expense_date DATE NOT NULL,
  receipt_url TEXT,
  ai_parsed_data JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 6. expense_participants (支出参与者表)
```sql
CREATE TABLE expense_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  share_amount DECIMAL(10,2),
  share_percentage DECIMAL(5,2),
  UNIQUE(expense_id, user_id)
);
```

### 7. settlements (结算记录表)
```sql
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  is_settled BOOLEAN DEFAULT false,
  settled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API 接口设计

### 认证相关
```
POST   /api/auth/register     # 用户注册
POST   /api/auth/login        # 用户登录
POST   /api/auth/refresh      # 刷新token
GET    /api/auth/profile      # 获取用户信息
```

### 行程管理
```
POST   /api/trips             # 创建行程
GET    /api/trips             # 获取用户的所有行程
GET    /api/trips/:id         # 获取行程详情
PUT    /api/trips/:id         # 更新行程信息
DELETE /api/trips/:id         # 删除行程
```

### 成员管理
```
POST   /api/trips/:id/members         # 添加成员
GET    /api/trips/:id/members         # 获取行程成员列表
DELETE /api/trips/:id/members/:userId # 移除成员
PUT    /api/trips/:id/members/:userId # 更新成员角色
```

### 支出管理
```
POST   /api/trips/:id/expenses        # 添加支出
GET    /api/trips/:id/expenses        # 获取支出列表
GET    /api/expenses/:id              # 获取支出详情
PUT    /api/expenses/:id              # 更新支出
DELETE /api/expenses/:id              # 删除支出
```

### 统计与结算
```
GET    /api/trips/:id/statistics      # 获取行程统计数据
GET    /api/trips/:id/balances        # 获取成员余额信息
POST   /api/trips/:id/calculate       # 计算结算方案
POST   /api/trips/:id/settle          # 执行结算
```

### AI功能
```
POST   /api/ai/parse-expense          # 解析支出描述
POST   /api/ai/categorize             # 智能分类
POST   /api/ai/suggest-split          # 建议分摊方案
```

## 项目目录结构

```
TripSum/
├── frontend/                      # 前端应用
│   ├── public/
│   ├── src/
│   │   ├── assets/               # 静态资源
│   │   ├── components/           # 可复用组件
│   │   │   ├── common/          # 通用组件
│   │   │   ├── expense/         # 支出相关组件
│   │   │   ├── trip/            # 行程相关组件
│   │   │   └── member/          # 成员相关组件
│   │   ├── pages/               # 页面组件
│   │   │   ├── Home.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── TripList.tsx
│   │   │   ├── TripDetail.tsx
│   │   │   ├── ExpenseForm.tsx
│   │   │   ├── MemberDashboard.tsx
│   │   │   └── Settlement.tsx
│   │   ├── services/            # API服务
│   │   │   ├── auth.service.ts
│   │   │   ├── trip.service.ts
│   │   │   ├── expense.service.ts
│   │   │   └── ai.service.ts
│   │   ├── stores/              # 状态管理
│   │   │   ├── auth.store.ts
│   │   │   ├── trip.store.ts
│   │   │   └── expense.store.ts
│   │   ├── utils/               # 工具函数
│   │   │   ├── calculation.ts   # 计算逻辑
│   │   │   ├── format.ts        # 格式化
│   │   │   └── validation.ts    # 验证
│   │   ├── types/               # TypeScript类型定义
│   │   │   ├── user.types.ts
│   │   │   ├── trip.types.ts
│   │   │   └── expense.types.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                      # 后端服务
│   ├── src/
│   │   ├── config/              # 配置文件
│   │   │   ├── database.ts
│   │   │   ├── redis.ts
│   │   │   └── ai.ts
│   │   ├── controllers/         # 控制器
│   │   │   ├── auth.controller.ts
│   │   │   ├── trip.controller.ts
│   │   │   ├── expense.controller.ts
│   │   │   └── ai.controller.ts
│   │   ├── middleware/          # 中间件
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   └── validation.middleware.ts
│   │   ├── models/              # Prisma模型
│   │   │   └── schema.prisma
│   │   ├── routes/              # 路由定义
│   │   │   ├── auth.routes.ts
│   │   │   ├── trip.routes.ts
│   │   │   ├── expense.routes.ts
│   │   │   └── index.ts
│   │   ├── services/            # 业务逻辑层
│   │   │   ├── auth.service.ts
│   │   │   ├── trip.service.ts
│   │   │   ├── expense.service.ts
│   │   │   ├── calculation.service.ts
│   │   │   └── ai.service.ts
│   │   ├── utils/               # 工具函数
│   │   │   ├── logger.ts
│   │   │   ├── jwt.ts
│   │   │   └── calculation.ts
│   │   ├── validators/          # 数据验证
│   │   │   ├── auth.validator.ts
│   │   │   ├── trip.validator.ts
│   │   │   └── expense.validator.ts
│   │   ├── types/               # TypeScript类型
│   │   │   └── index.ts
│   │   └── app.ts               # 应用入口
│   ├── prisma/
│   │   ├── migrations/          # 数据库迁移
│   │   └── seed.ts             # 种子数据
│   ├── .env.example
│   ├── tsconfig.json
│   └── package.json
│
├── database/                     # 数据库脚本
│   ├── init.sql                # 初始化脚本
│   └── backup/                 # 备份目录
│
├── docs/                        # 项目文档
│   ├── API.md                  # API文档
│   ├── DEPLOYMENT.md           # 部署文档
│   └── TESTING.md              # 测试文档
│
├── docker/                      # Docker配置
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   └── docker-compose.yml
│
├── scripts/                     # 脚本
│   ├── setup.sh                # 环境设置脚本
│   └── deploy.sh               # 部署脚本
│
├── .gitignore
├── README.md                    # 项目说明
└── LICENSE

```

## 核心功能实现

### 1. 余额计算算法

```typescript
interface BalanceCalculation {
  userId: string;
  totalPaid: number;      // 总支付金额
  totalShare: number;     // 应承担金额
  balance: number;        // 余额 (totalPaid - totalShare)
  owesTo: Map<string, number>;    // 欠款详情
  owedBy: Map<string, number>;    // 应收详情
}

function calculateBalances(expenses: Expense[]): Map<string, BalanceCalculation> {
  // 1. 计算每人支付总额
  // 2. 计算每人应承担总额
  // 3. 计算净余额
  // 4. 优化债务关系（最少交易次数）
  return balances;
}
```

### 2. AI账单解析

```typescript
interface AIParseResult {
  participants: string[];      // 参与者
  category: string;            // 分类
  splitMethod: 'equal' | 'custom' | 'percentage';
  splitDetails: Map<string, number>;
}

async function parseExpenseWithAI(description: string, context: TripContext): Promise<AIParseResult> {
  const prompt = `
    分析以下消费描述，识别参与者和分摊方式：
    描述：${description}
    团队成员：${context.members.join(', ')}
    
    返回JSON格式：
    - participants: 参与者列表
    - category: 消费类别
    - splitMethod: 分摊方式
    - splitDetails: 具体分摊金额
  `;
  
  const result = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });
  
  return JSON.parse(result.choices[0].message.content);
}
```

### 3. 实时同步机制

```typescript
// 使用WebSocket实现实时同步
import { Server } from 'socket.io';

class RealtimeSync {
  constructor(io: Server) {
    io.on('connection', (socket) => {
      // 加入行程房间
      socket.on('join-trip', (tripId) => {
        socket.join(`trip-${tripId}`);
      });
      
      // 监听支出变化
      socket.on('expense-update', (data) => {
        // 广播给房间内其他用户
        socket.to(`trip-${data.tripId}`).emit('expense-updated', data);
      });
    });
  }
}
```

## 开发计划

### Phase 1: 基础架构搭建 (第1周)

**Day 1-2: 项目初始化**
- [x] 创建项目目录结构
- [ ] 初始化前端React项目
- [ ] 初始化后端Express项目
- [ ] 配置TypeScript、ESLint、Prettier

**Day 3-4: 数据库设计**
- [ ] 安装配置PostgreSQL和Redis
- [ ] 创建Prisma schema
- [ ] 编写数据库迁移脚本
- [ ] 创建种子数据

**Day 5-7: 认证系统**
- [ ] 实现用户注册/登录API
- [ ] JWT认证中间件
- [ ] 前端登录页面
- [ ] 状态管理配置

### Phase 2: 核心功能开发 (第2周)

**Day 8-10: 行程管理**
- [ ] 行程CRUD API
- [ ] 成员管理API
- [ ] 行程列表页面
- [ ] 行程详情页面

**Day 11-14: 支出管理**
- [ ] 支出CRUD API
- [ ] 支出表单组件
- [ ] 支出列表展示
- [ ] 图片上传功能

### Phase 3: 计算与统计 (第3周)

**Day 15-17: 余额计算**
- [ ] 余额计算算法
- [ ] 统计API开发
- [ ] 成员看板页面
- [ ] 数据可视化

**Day 18-21: 结算功能**
- [ ] 债务优化算法
- [ ] 结算方案生成
- [ ] 结算页面UI
- [ ] 结算记录管理

### Phase 4: AI集成与优化 (第4周)

**Day 22-24: AI功能**
- [ ] 集成OpenAI API
- [ ] 账单解析功能
- [ ] 智能分类系统
- [ ] 前端AI交互界面

**Day 25-28: 测试与优化**
- [ ] 单元测试编写
- [ ] 集成测试
- [ ] 性能优化
- [ ] Bug修复

### Phase 5: 部署上线 (第5周)

**Day 29-30: 部署准备**
- [ ] Docker镜像构建
- [ ] 环境变量配置
- [ ] CI/CD配置
- [ ] 生产环境部署

## 开发规范

### 代码规范

1. **命名规范**
   - 文件名: kebab-case (如 `user-service.ts`)
   - 类名: PascalCase (如 `UserService`)
   - 函数/变量: camelCase (如 `calculateBalance`)
   - 常量: UPPER_SNAKE_CASE (如 `MAX_RETRY_COUNT`)

2. **Git提交规范**
   ```
   feat: 新功能
   fix: 修复bug
   docs: 文档更新
   style: 代码格式调整
   refactor: 重构
   test: 测试相关
   chore: 构建/工具相关
   ```

3. **API响应格式**
   ```typescript
   interface ApiResponse<T> {
     success: boolean;
     data?: T;
     error?: {
       code: string;
       message: string;
     };
     timestamp: number;
   }
   ```

### 测试规范

1. **单元测试覆盖率**: >= 80%
2. **测试文件命名**: `*.test.ts` 或 `*.spec.ts`
3. **测试用例结构**:
   ```typescript
   describe('UserService', () => {
     describe('createUser', () => {
       it('should create a new user successfully', async () => {
         // Arrange
         // Act
         // Assert
       });
     });
   });
   ```

## 部署配置

### Docker Compose配置

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: tripsum
      POSTGRES_USER: tripsum_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  backend:
    build:
      context: ./backend
      dockerfile: ../docker/Dockerfile.backend
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    ports:
      - "3000:3000"

  frontend:
    build:
      context: ./frontend
      dockerfile: ../docker/Dockerfile.frontend
    environment:
      VITE_API_URL: ${API_URL}
    ports:
      - "5173:5173"

volumes:
  postgres_data:
```

### 环境变量配置

**.env.example**
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/tripsum
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# AI Service
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4

# File Storage
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# App
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:5173
```

## 性能优化策略

1. **前端优化**
   - 路由懒加载
   - 图片懒加载和压缩
   - 虚拟滚动（长列表）
   - 请求防抖和节流
   - 状态持久化

2. **后端优化**
   - 数据库索引优化
   - Redis缓存策略
   - 批量操作优化
   - 分页查询
   - 连接池管理

3. **API优化**
   - 响应压缩 (gzip)
   - 字段过滤 (GraphQL-like)
   - 数据预加载
   - CDN静态资源

## 安全措施

1. **认证授权**
   - JWT Token + Refresh Token
   - 权限中间件
   - API Rate Limiting

2. **数据安全**
   - 密码加密存储 (bcrypt)
   - SQL注入防护 (Parameterized Queries)
   - XSS防护 (Content Security Policy)
   - HTTPS强制

3. **隐私保护**
   - 敏感数据脱敏
   - 日志信息过滤
   - GDPR合规

## 监控与日志

1. **应用监控**
   - 错误追踪 (Sentry)
   - 性能监控 (New Relic)
   - 健康检查端点

2. **日志管理**
   - Winston日志库
   - 日志分级 (error, warn, info, debug)
   - 日志轮转

## 常见问题解决方案

### Q1: 如何处理并发支出记录？
使用数据库事务和乐观锁机制，确保数据一致性。

### Q2: 如何优化大量支出记录的计算性能？
- 使用Redis缓存计算结果
- 增量计算而非全量计算
- 后台任务队列处理

### Q3: 如何确保AI解析的准确性？
- 提供用户确认和修改机制
- 建立反馈学习系统
- 设置置信度阈值

## 后续扩展功能

1. **高级功能**
   - 多币种支持
   - 预算管理
   - 定期支出
   - 支出趋势分析
   - 导出报表

2. **社交功能**
   - 好友系统
   - 行程分享
   - 评论功能
   - 支出投票

3. **集成功能**
   - 支付宝/微信支付集成
   - 银行卡账单导入
   - 发票识别OCR
   - 地图定位

## 联系方式

- 项目负责人: [Your Name]
- 技术支持邮箱: support@tripsum.com
- 项目仓库: https://github.com/yourusername/tripsum

---

最后更新时间: 2024-08-26