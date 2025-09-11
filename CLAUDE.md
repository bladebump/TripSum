# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 用户需求
- 如果要测试运行项目端的话让用户运行，而不是自己运行后台进程
- 每次需求做完，维护readme.md、todo.md、CHANGELOG.md、CLAUDE.md。
- 在修复bug的时候，不要进行临时修复，彻查相关问题，直接做更高更优雅的修复。也不考虑向前向后兼容。

## Project Overview

TripSum (旅算) 是专为小团体设计的旅行费用分摊应用。v2.0.0是一个里程碑版本，将应用从记账工具升级为完整的多人协作平台，实现了真实用户邀请系统和企业级消息架构。

### 🎯 v2.0.0 核心功能
- **真实用户邀请系统**: 完整的ADD/REPLACE模式邀请流程，无门槛团队协作
- **消息中心**: 统一通知管理，实时推送，批量操作
- **权限管理**: 管理员与成员角色分离，细粒度功能控制
- **消息队列架构**: Bull + Redis异步处理，13个专门消息处理器
- **性能优化**: 前端打包体积减少44%，首屏加载显著提升
- **基金池模式**: 预收基金管理，智能支付识别
- **AI记账**: 自然语言解析，意图识别，计算器工具集成
- **虚拟成员**: 支持未注册用户参与计算，无缝数据迁移

## Tech Stack

### Frontend
- **React 18** with TypeScript 5
- **Ant Design Mobile 5** for UI components
- **Zustand** for state management
- **Vite** as build tool with optimized chunking
- **Recharts** for data visualization (lazy loaded)
- **Socket.io-client** for real-time communication

### Backend
- **Node.js 20** with Express and TypeScript
- **Prisma ORM** with PostgreSQL 15
- **Redis 7** for caching, sessions, and message queue
- **Bull** for asynchronous message processing
- **Socket.io** for real-time communication
- **JWT** for authentication with refresh token rotation
- **OpenAI GPT-4** / Claude API for AI features

### Infrastructure
- **Docker Compose** for production deployment
- **Nginx** as reverse proxy
- **PostgreSQL 15** as primary database
- **Redis 7** for caching and queue management

## Essential Commands

### Development Setup
```bash
# Backend setup
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

### Production Deployment
```bash
# One-click deployment
./manage.sh deploy          # Complete deployment with git pull
./manage.sh quick           # Quick deployment without git pull
./manage.sh status          # Check service status
./manage.sh logs            # View logs
./manage.sh restart         # Restart services
```

### Common Development Tasks
```bash
# Testing
cd backend && npm run test  # Run Jest tests
npm run lint               # ESLint check

# Database
npx prisma generate        # Generate Prisma client
npx prisma migrate dev     # Run migrations
npx prisma db seed        # Seed database

# Build
npm run build             # Build for production
```

## API Documentation

API documentation is modularized for maintainability:

- **docs/API_OVERVIEW.md** - API overview, common formats, error codes
- **docs/API_AUTH.md** - Authentication and user management
- **docs/API_TRIP.md** - Trip and member management
- **docs/API_EXPENSE.md** - Expense recording and management
- **docs/API_STATISTICS.md** - Statistics, balances, and settlements
- **docs/API_AI.md** - AI parsing and natural language processing
- **docs/API_MESSAGES.md** - Message system (v2.0.0)
- **docs/API_INVITATION.md** - Invitation system (v2.0.0)

## Code Architecture

### Database Schema (Key Models)
- **User** - User accounts with authentication
- **Trip** - Travel groups with currency and fund management
- **TripMember** - Membership with roles and contribution tracking
- **Expense** - Individual expenses with payment source tracking
- **TripInvitation** - Invitation records with status and expiry (v2.0.0)
- **Message** - Unified messaging system (v2.0.0)
- **MessageTemplate** - Standardized message formats (v2.0.0)
- **MessagePreference** - User notification settings (v2.0.0)

### Message System Architecture (v2.0.0)
```
Message Queue (Bull + Redis)
├── Message Factory Service
├── Message Dispatcher Service  
├── 13 Specialized Handlers
│   ├── InvitationMessageHandler
│   ├── ExpenseCreatedHandler
│   ├── SystemMessageHandler
│   └── ... (10 more handlers)
└── Cache Service (Redis)
```

### State Management (Frontend)
- **authStore** - Authentication state, user session
- **tripStore** - Current trip data, members, expenses
- **expenseStore** - Expense form state and calculations
- **messageStore** - Messages, unread counts, preferences (v2.0.0)

## Key Development Notes

### 🔑 Architecture Principles

1. **Member Identification**
   - **memberId (TripMember.id)**: Primary identifier for ALL business logic
   - **userId**: Reserved ONLY for JWT authentication and User table linkage
   - Virtual members have memberId but no userId

2. **Permission System**
   - **Route-level control**: Use `requireAdmin` middleware at route layer
   - **Frontend UI control**: For user experience optimization only
   - **Clear boundaries**: Admin vs member functionality strictly separated

3. **Fund Management**
   - Balance formula: `contribution + reimbursements - shares`
   - Smart payment recognition: Admin = fund pool, Others = reimbursement
   - Real-time fund pool status tracking

4. **Message Queue Design**
   - Bull + Redis (not RabbitMQ) for reduced complexity
   - Plugin-style handler architecture for extensibility
   - Multi-layer caching for performance optimization

### 🚀 Performance Best Practices

1. **Frontend Optimization**
   - Route-level lazy loading with React.lazy
   - Manual chunk splitting for vendor libraries
   - Recharts dynamic import for chart components
   - Tree-shaking enabled for antd-mobile

2. **Backend Optimization**
   - Prisma transactions for data consistency
   - Redis caching for frequently accessed data
   - Bull queue for async message processing
   - WebSocket connection pooling

3. **Database Design**
   - Use Prisma migrations for schema changes
   - Index optimization for query performance
   - Soft deletes for audit trails

### 🔧 Development Workflow

1. **AI Features**
   - Intent classification → Specialized parsing → Unified coordination
   - Calculator tool integration for precise mathematical operations
   - Context-aware parsing with member information

2. **Real-time Features**
   - Socket.io for live updates (expenses, invitations, messages)
   - Automatic reconnection and connection state management
   - User-specific rooms for targeted notifications

3. **Testing Strategy**
   - Jest for backend unit and integration tests
   - Test data factories for consistent test data
   - Separate test database for isolation

## Version History & Milestones

### v2.0.0 (2025-09-11) - 真实用户邀请系统
**Major milestone**: Transformed from accounting tool to collaboration platform
- Complete invitation system with ADD/REPLACE modes
- Enterprise-grade message queue architecture  
- Fine-grained permission system
- 44% frontend bundle size reduction
- 12 critical bug fixes

### v1.10.0 (2025-09-04) - userId架构优化
- Unified member identification system
- Clear separation of userId vs memberId usage
- Standardized data access layer

### v1.4.0 (2025-08-28) - 基金池模式
- Fund contribution tracking system
- Smart payment recognition
- Dual payment mode support

### v1.0.0 (2024-08) - 初始版本
- Basic expense splitting functionality
- Virtual member support
- Mobile-first UI design

## Important File Locations

### v2.0.0 Core Files
```
backend/src/
├── queues/message.queue.ts              # Message queue implementation
├── services/message/
│   ├── handlers/                        # 13 message handlers
│   ├── factory.service.ts               # Message factory
│   ├── dispatcher.service.ts            # Message dispatcher
│   └── cache.service.ts                 # Redis caching
├── services/invitation/                 # Invitation system
└── middleware/auth.ts                   # Permission control

frontend/src/
├── utils/permission.ts                  # Frontend permission utilities
├── stores/message.store.ts              # Message state management
└── components/invitation/               # Invitation UI components
```

### Configuration Files
- **docker-compose.yml** - Production deployment
- **manage.sh** - Deployment automation script
- **prisma/schema.prisma** - Database schema
- **vite.config.ts** - Frontend build optimization

---

**Current Version**: v2.0.0  
**Next Focus**: Deployment and release optimization  
**Last Updated**: 2025-09-11