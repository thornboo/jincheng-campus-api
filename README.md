# jincheng-campus-api

🎓 金橙校园后端API服务 - 基于 Node.js + Express + TypeScript

## 📋 项目介绍

金橙校园项目的后端服务，提供用户认证、失物招领、闲置交易、兼职信息等校园服务功能的API接口。

## 🛠️ 技术栈

- **运行时**: Node.js 18+
- **框架**: Express.js
- **语言**: TypeScript
- **数据库**: MySQL + Prisma ORM
- **缓存**: Redis
- **认证**: JWT
- **实时通信**: Socket.IO
- **文件上传**: Multer
- **API文档**: Swagger

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- MySQL >= 8.0
- Redis >= 6.0

### 安装依赖

```bash
npm install
```

### 环境配置

复制环境变量配置文件：

```bash
cp .env.development .env
```

修改 `.env` 文件中的配置：

```env
DATABASE_URL="mysql://username:password@localhost:3306/jincheng_campus"
JWT_SECRET=your-super-secret-jwt-key
```

### 数据库迁移

```bash
npm run db:push
```

### 启动开发服务器

```bash
npm run dev
```

服务将在 http://localhost:3001 启动

## 📁 项目结构

```
src/
├── controllers/     # 控制器
├── services/        # 业务逻辑
├── models/          # 数据模型
├── routes/          # 路由配置
├── middleware/      # 中间件
├── utils/           # 工具函数
├── schemas/         # 数据验证
└── types/           # 类型定义
```

## 📚 API 文档

启动服务后访问: http://localhost:3001/api-docs

## 🔧 开发命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建项目
npm run start        # 启动生产服务器
npm run lint         # 代码检查
npm run test         # 运行测试
```

## 📄 许可证

MIT License