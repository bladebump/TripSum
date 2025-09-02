# TripSum 旅算

> 让旅行费用分摊变得简单 - 专为小团体旅行设计的智能记账应用

![Version](https://img.shields.io/badge/version-1.5.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)
![React](https://img.shields.io/badge/React-18-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## 项目简介

TripSum（旅算）是一个专为小团体旅行设计的费用分摊应用。它帮助朋友们在旅行中轻松记录共同消费，并通过智能算法快速、准确地计算出每个人应支付或收回的金额，实现零和结算。

### 核心特性

- **💰 基金池模式**: 支持基金预收和累计缴纳，实时追踪资金池状态
- **🤖 智能记账**: AI自然语言解析，精准识别基金缴纳、消费和收入
- **🧮 智能计算器**: AI集成Function Calling计算工具，确保金额精确
- **👥 统一成员系统**: 虚拟成员与真实用户完全一致的功能体验
- **🔑 统一标识架构**: memberId作为核心业务标识，userId仅用于认证
- **📊 实时余额**: 公式化计算（缴纳+垫付-分摊=余额）
- **🔧 模块化AI**: 意图优先的解析架构，支持费用/成员/混合/结算等多种意图
- **📱 优化界面**: 直观的操作按钮网格，替代隐蔽的交互方式
- **🛡️ 权限管理**: 基于角色的功能显示，管理员专属功能
- **📈 数据统计**: 可视化展示消费趋势和分类占比
- **⚡ 实时同步**: WebSocket实现多人实时协作
- **🔄 API精简**: 从28个API精简至20个，去除冗余接口

## 技术栈

### 前端
- **React 18** + **TypeScript 5** - 现代化前端框架
- **Ant Design Mobile 5** - 移动端UI组件库
- **Zustand** - 轻量级状态管理
- **Vite** - 快速的构建工具
- **Recharts** - 数据可视化图表

### 后端
- **Node.js 20** + **Express** - 后端服务框架
- **Prisma ORM** - 现代化数据库工具
- **PostgreSQL 15** - 主数据库
- **Redis 7** - 缓存和会话存储
- **Socket.io** - WebSocket实时通信
- **JWT** - 安全认证

### AI集成
- **OpenAI GPT-4** / **Claude API** - 大语言模型
- 自然语言处理 - 智能解析账单描述
- 智能分类系统 - 自动归类支出
- 分摊建议 - AI辅助费用分配

## 快速开始

### 环境要求

- Node.js >= 20.0.0
- PostgreSQL >= 15
- Redis >= 7
- Docker & Docker Compose (可选)
- npm 或 pnpm

### 安装步骤

1. **克隆项目**
```bash
git clone git@github.com:bladebump/TripSum.git
cd TripSum
```

2. **安装依赖**
```bash
# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../backend
npm install
```

3. **配置环境变量**
```bash
# 复制环境变量模板
cp backend/.env.example backend/.env
# 编辑 .env 文件，填入你的配置
```

4. **初始化数据库**
```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

5. **启动开发服务器**
```bash
# 启动后端服务（新终端）
cd backend
npm run dev

# 启动前端服务（新终端）
cd frontend
npm run dev
```

访问 http://localhost:5173 开始使用！

## 项目结构

```
TripSum/
├── frontend/          # 前端应用
│   ├── src/
│   │   ├── components/    # React组件
│   │   ├── pages/        # 页面组件
│   │   ├── services/     # API服务
│   │   └── stores/       # 状态管理
│   └── package.json
├── backend/           # 后端服务
│   ├── src/
│   │   ├── controllers/  # 控制器
│   │   ├── models/       # 数据模型
│   │   ├── routes/       # 路由
│   │   └── services/     # 业务逻辑
│   └── package.json
├── docs/              # 项目文档
└── README.md
```

## 功能介绍

### 基金管理（双模式支付系统）
- **基金缴纳**: 成员预先缴纳资金到团队基金池
- **双重支付模式**: 
  - 管理员付款 = 基金池支付（默认）
  - 非管理员付款 = 个人垫付（需要从基金池报销）
- **智能识别**: AI自动识别付款人，判断支付来源
- **余额计算**: 实时计算每人余额 = 缴纳 + 垫付 - 应分摊
- **基金池管理**: 基金池可为负数，表示透支状态
- **智能结算**: 自动计算最终应收/应付金额

### 行程管理
- 创建旅行账本，设置初始基金
- 邀请朋友加入，共同管理
- 支持多个行程并行管理
- 实时显示基金池总额

### 支出记录
- 快速添加消费记录
- 上传凭证照片
- 自定义分摊方式（平均/自定义/百分比）
- AI智能识别参与者和金额

### 智能分析
- AI解析自然语言描述
- 自动识别参与者和金额
- 智能消费分类

### 结算功能
- 实时计算每人余额
- 优化债务关系，减少交易次数
- 一键生成结算方案

## API文档

详细的API文档请查看 [API.md](./docs/API.md)

## 开发指南

### 运行测试
```bash
# 前端测试
cd frontend
npm run test

# 后端测试
cd backend
npm run test
```

### 代码规范
```bash
# 运行代码检查
npm run lint

# 自动修复格式问题
npm run lint:fix
```

### 构建部署
```bash
# 构建前端
cd frontend
npm run build

# 构建后端
cd backend
npm run build
```

## 开发环境

### 快速启动

```bash
# 1. 克隆项目
git clone <your-repo-url>
cd TripSum

# 2. 安装依赖
cd backend && npm install
cd ../frontend && npm install

# 3. 配置环境变量
cp .env.example backend/.env
# 编辑 backend/.env 设置数据库连接等

# 4. 准备数据库（选择一种方式）
# 方式1: 本地安装PostgreSQL和Redis
# 方式2: 使用云数据库服务
# 方式3: Docker本地数据库服务（可选）

# 5. 运行迁移和种子数据
cd backend
npx prisma migrate dev
npx prisma db seed

# 6. 启动开发服务器
# 后端（终端1）
cd backend && npm run dev

# 前端（终端2）
cd frontend && npm run dev
```

### 数据库配置选项

**方式1: 本地安装**
```bash
# Ubuntu/Debian
sudo apt install postgresql redis-server

# macOS
brew install postgresql redis

# 配置数据库
sudo -u postgres createdb tripsum
sudo -u postgres createuser tripsum_user
```

**方式2: 使用云服务**
- PostgreSQL: AWS RDS, Google Cloud SQL, 阿里云RDS等
- Redis: AWS ElastiCache, 阿里云Redis等

**方式3: Docker本地服务（可选）**
```bash
# 仅启动数据库服务用于开发
docker run -d --name tripsum-postgres -p 5432:5432 -e POSTGRES_DB=tripsum -e POSTGRES_USER=tripsum_user -e POSTGRES_PASSWORD=tripsum_password postgres:15-alpine
docker run -d --name tripsum-redis -p 6379:6379 redis:7-alpine
```

## 生产环境部署

### 一键部署（推荐）

```bash
# 1. 克隆项目
git clone <your-repo-url>
cd TripSum

# 2. 配置生产环境
cp .env.example .env
nano .env  # 编辑配置

# 必须修改的配置项：
# NODE_ENV=production
# JWT_SECRET=your-super-secure-jwt-secret
# POSTGRES_PASSWORD=your-strong-password  
# CLIENT_URL=http://your-server-ip
# VITE_API_URL=http://your-server-ip/api
# OPENAI_API_KEY=your-openai-api-key

# 3. 一键部署
./manage.sh deploy
```

### 管理命令

```bash
# 查看服务状态
./manage.sh status

# 查看日志
./manage.sh logs
./manage.sh logs backend  # 查看特定服务日志

# 重启服务
./manage.sh restart
./manage.sh restart nginx  # 重启特定服务

# 快速更新部署（含 git pull）
./manage.sh quick

# 数据备份
./manage.sh backup

# 停止服务
./manage.sh stop

# 查看帮助
./manage.sh help
```

### 部署特点
- ✅ **支持IP地址直接访问**，无需域名
- ✅ **自动Git同步**，部署时自动拉取最新代码
- ✅ 简化配置，只需一个环境文件
- ✅ 移除MinIO，节省资源
- ✅ Nginx反向代理和静态资源缓存
- ✅ 健康检查和自动重启
- ✅ 数据持久化存储和备份

### 常见问题

**Q: 无法通过IP访问？**
```bash
# 检查防火墙
sudo ufw allow 80
sudo ufw allow 443

# 检查服务状态
./manage.sh status
```

**Q: API请求失败？**
```bash
# 测试API健康检查
curl http://your-server-ip/health

# 检查后端日志
./manage.sh logs backend
```

**Q: 如何更新项目？**
```bash
# 快速更新（自动git pull + 重新部署）
./manage.sh quick
```

## 贡献指南

欢迎提交Issue和Pull Request！

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 项目截图

### 移动端界面
- 📱 完美适配手机屏幕
- 👆 支持手势操作
- 🎨 精美的UI设计

## 特色功能

### 🤖 AI智能解析
基于模块化意图识别架构，支持复杂场景：

**支持的意图类型：**
- **基金缴纳**: "每人上存5000"、"大家都缴纳基金1000"
- **费用记录**: "昨晚吃饭花了300元，我和张三李四一起"
- **成员管理**: "添加小明和小红两个成员"
- **混合意图**: "和新朋友王五一起打车50元" (自动识别新成员+记账)
- **结算查询**: "看看谁欠谁钱"

**AI自动识别：**
- 基金缴纳金额（累计模式）
- 消费金额和类型
- 参与人员（虚拟成员=真实用户）
- 消费类别和分摊方式
- 复杂语境下的多重意图

### 📊 可视化统计
- 饼图展示支出分类占比
- 柱状图对比成员支付情况
- 实时余额计算（缴纳+垫付-分摊）
- 债务关系清晰展示

### 💰 智能结算
- 优化债务关系，减少交易次数
- 一键生成结算方案
- 支持多种结算方式
- 虚拟成员与真实用户平等参与

## 项目架构

```
TripSum/
├── .env.example       # 环境变量配置模板
├── docker-compose.yml # 生产环境Docker配置
├── manage.sh          # 生产环境管理脚本
├── frontend/          # React前端应用
├── backend/           # Express后端服务
├── database/          # 数据库初始化脚本
└── docker/            # Nginx等Docker配置文件
```

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 开发规范
- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 代码规范
- 提交前运行测试
- 保持代码简洁可读

## 技术支持

遇到问题？
- 📖 查看项目文档
- 🐛 提交[Issue](https://github.com/bladebump/TripSum/issues)
- 💬 加入讨论

## 版本历史

### v1.5.1 (2025-09-01) ⚡ 最新版本
- **📦 大幅简化**: 从9个配置文件简化为2个核心文件，减少复杂性
- **🔧 开发环境本地化**: 完全本地开发，无需Docker依赖
- **🚀 一键生产部署**: 自动Git同步，智能环境检查
- **🌍 IP直接访问**: 优化CORS和Nginx配置，无需域名
- **🗑️ 移除冗余**: 删除MinIO和多余部署文档，专注核心功能

### v1.5.0 (2025-08-29)
- **🏗️ 架构重构**: 完成userId到memberId架构迁移，统一标识体系
- **💼 管理员中心化结算**: 所有结算通过管理员节点进行，简化债务关系
- **🚀 API性能优化**: getUserTrips减少90%+数据传输，提升响应速度
- **🧪 完整测试体系**: 搭建Jest(后端)+Vitest(前端)测试框架
- **🐛 Bug修复**: 修复虚拟成员显示、余额计算等关键问题
- **📝 文档完善**: 更新API文档、技术架构说明

### v1.4.0 (2025-08-28)
- **🔄 API架构重构**: 整合统计API，优化数据结构
- **📊 统计功能增强**: 新增成员财务详情，完善基金池状态追踪
- **🛠️ 计算引擎升级**: 重构余额计算逻辑，支持复杂场景
- **🔧 服务层优化**: 统一前后端数据结构，提升维护性

### v1.3.0 (2025-08-27) 🎉
- **💰 双模式支付系统**: 创新的基金池+垫付混合管理
- **🤖 AI计算器工具**: Function Calling集成，确保计算精确
- **🎯 多行程支持**: 记账页面支持行程切换
- **📊 智能统计**: 区分基金池与个人垫付统计

### v1.2.0 (2025-08-27)
- **🎨 界面重大优化**: TripDetail页面操作按钮网格化
- **🤖 模块化AI架构**: 意图优先解析系统
- **👥 虚拟成员支持**: 未注册用户参与计算
- **🛡️ 权限管理**: 基于角色的功能控制

### 早期版本 (2024-08)
- **v1.1.0**: AI智能记账、成员看板、实时通信
- **v1.0.0**: 核心功能发布、移动端适配

## 联系方式

- 项目主页: [https://github.com/bladebump/TripSum](https://github.com/bladebump/TripSum)
- Issue追踪: [https://github.com/bladebump/TripSum/issues](https://github.com/bladebump/TripSum/issues)

## 技术架构

### 核心设计原则
- **memberId优先**: 业务逻辑统一使用memberId，userId仅用于认证
- **管理员中心**: 基金管理和结算通过管理员节点统一处理
- **虚拟成员平等**: 虚拟成员与真实用户享有完全一致的功能
- **API精简**: 从28个接口优化至20个，提升维护性
- **实时同步**: Socket.io实现多人协作和数据同步

### 数据流架构
```
用户操作 → 前端Store → API服务 → 业务Service → Prisma ORM → PostgreSQL
     ↑                                                          ↓
 WebSocket ← Socket.io ← 实时推送 ← 数据变更事件 ← Redis缓存
```

### 测试策略
- **单元测试**: Jest(后端) + Vitest(前端)
- **集成测试**: 完整业务流程测试
- **真实服务**: 避免过度Mock，使用真实数据库和服务

## 致谢

感谢所有为这个项目做出贡献的开发者！

特别感谢：
- React + TypeScript 生态提供的强大基础
- Ant Design Mobile 的优秀移动端组件
- Prisma ORM 的现代化数据库操作
- AI模型提供的智能解析能力

---

Made with ❤️ by [bladebump](https://github.com/bladebump)