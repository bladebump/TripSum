# TripSum 旅算

> 让旅行费用分摊变得简单 - 专为小团体旅行设计的智能记账应用

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)
![React](https://img.shields.io/badge/React-18-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## 项目简介

TripSum（旅算）是一个专为小团体旅行设计的费用分摊应用。它帮助朋友们在旅行中轻松记录共同消费，并通过智能算法快速、准确地计算出每个人应支付或收回的金额，实现零和结算。

### 核心特性

- **智能记账**: 快速记录旅行消费，支持多人分摊
- **实时计算**: 自动计算每人余额，清晰展示债务关系
- **AI辅助**: 自然语言解析账单，智能分类和归属
- **团队协作**: 多人实时同步，共同管理账本
- **数据统计**: 可视化展示消费趋势和分类占比

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

### 行程管理
- 创建旅行账本，设置初始基金
- 邀请朋友加入，共同管理
- 支持多个行程并行管理

### 支出记录
- 快速添加消费记录
- 上传凭证照片
- 自定义分摊方式（平均/自定义/百分比）

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

## Docker部署

```bash
# 使用Docker Compose启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f
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
输入自然语言描述，AI自动识别：
- 消费金额
- 参与人员
- 消费类别
- 分摊方式

例如："昨晚吃饭花了300，张三和李四一起，我付的钱"

### 📊 可视化统计
- 饼图展示支出分类占比
- 柱状图对比成员支付情况
- 实时余额计算
- 债务关系清晰展示

### 💰 智能结算
- 优化债务关系，减少交易次数
- 一键生成结算方案
- 支持多种结算方式

## 项目架构

```
TripSum/
├── frontend/          # React前端应用
├── backend/           # Express后端服务
├── database/          # 数据库相关
├── docker/            # Docker配置
├── docs/              # 项目文档
└── scripts/           # 自动化脚本
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
- 📖 查看[开发文档](./DEVELOPMENT.md)
- 🐛 提交[Issue](https://github.com/bladebump/TripSum/issues)
- 💬 加入讨论

## 更新日志

### v1.0.0 (2024-08-26)
- 🎉 首次发布
- ✨ 核心功能完成
- 📱 移动端适配
- 🤖 AI智能集成

## 联系方式

- 项目主页: [https://github.com/bladebump/TripSum](https://github.com/bladebump/TripSum)
- Issue追踪: [https://github.com/bladebump/TripSum/issues](https://github.com/bladebump/TripSum/issues)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=bladebump/TripSum&type=Date)](https://star-history.com/#bladebump/TripSum&Date)

## 致谢

感谢所有为这个项目做出贡献的开发者！

特别感谢：
- React团队提供的优秀框架
- Ant Design团队的精美组件
- OpenAI提供的强大AI能力

---

Made with ❤️ by [bladebump](https://github.com/bladebump)