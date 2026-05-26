# Jijishop

一个基于 Vue 3 + Express 的前后端分离电商练习项目，支持商品浏览、购物车、下单、订单管理、收藏、评价、优惠码和后台管理等功能。

## 技术栈

### 前端
- Vue 3
- Vite
- Vue Router
- Pinia

### 后端
- Node.js
- Express
- sql.js
- JWT
- bcryptjs

## 项目功能

- 用户注册、登录
- 商品列表、商品详情
- 商品分类浏览
- 购物车
- 收藏商品
- 下单与订单管理
- 优惠码功能
- 商品评价
- 管理员/商家后台
- 商品上传与静态资源访问

## 项目结构

```text
.
├─ client/         # 前端项目
├─ server/         # 后端项目
├─ package.json    # 根目录脚本
└─ README.md
```

## 本地运行

### 1. 安装依赖

根目录安装：

```bash
npm install
```

前端安装：

```bash
cd client
npm install
```

后端安装：

```bash
cd ../server
npm install
```

### 2. 启动项目

回到根目录执行：

```bash
npm run dev
```

启动后：
- 前端默认地址：http://localhost:5173
- 后端默认地址：http://localhost:3000

## 可用脚本

### 根目录
```bash
npm run dev      # 同时启动前后端
npm run build    # 构建前端
npm run start    # 启动后端生产模式
```

### 前端
```bash
cd client
npm run dev
npm run build
npm run preview
```

### 后端
```bash
cd server
npm run dev
npm start
```

## 默认说明

项目启动时会自动初始化数据，并写入部分演示账号和商品数据。

可根据后端种子数据自行体验：
- 普通用户账号示例：`buyer1` / `123456`
- 管理员账号示例：`seller1` / `123456`

## 接口代理

前端开发环境会将以下请求代理到后端：
- `/api`
- `/uploads`

## 注意事项

- 本项目适合学习和演示，不建议直接用于生产环境
- 本地数据库文件已被忽略，不建议上传到 GitHub
- 如需部署，建议补充环境变量配置和生产环境构建说明

## 后续可改进

- 补充 README 截图
- 增加部署教程
- 增加接口文档
- 增加权限说明
