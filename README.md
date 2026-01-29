# Pixel Art Editor（拼豆图纸编辑器）

一个用于 **拼豆/Perler/Fuse Beads** 的图纸编辑与管理 Web 应用：可创建像素图案、编辑与保存、标签检索、HEX 颜色匹配到 **MARD 221 色号**，并支持高性能画布渲染与移动端只读预览。

## 功能特性

- 图纸管理：创建 / 编辑 / 删除 / 浏览，支持分页、搜索、标签筛选
- 编辑器：画笔 / 橡皮 / 填充，撤销/重做，缩放与平移
- 只读预览：移动端友好，便于边看边拼
- 颜色系统：MARD 221 色号库 + HEX 自动匹配（CIEDE2000）
- 性能优化：离屏 Canvas + ImageData 批量渲染、HiDPI 支持、RAF 节流
- 数据压缩：像素数据使用 RLE（行程编码）在前后端/DB 中统一存储与传输

## 技术栈

- 后端：Node.js（ESM） + Express + SQLite（better-sqlite3）
- 前端：React + Vite + React Router + Zustand
- 画布：Konva / React-Konva
- 校验：Zod
- 日志：Pino

## 快速开始

### 前置要求

- Node.js `>= 18`

### 安装依赖

```bash
npm install
cd client && npm install && cd ..
```

### 初始化数据库

```bash
npm run db:init
```

默认会生成数据库文件：`data/pixelart.db`（可通过环境变量覆盖）。

### 开发模式

```bash
npm run dev
```

- 前端：http://localhost:5173
- 后端：http://localhost:4571
- 健康检查：http://localhost:4571/api/health

## 常用脚本

根目录（同时管理前后端）：

- `npm run dev`：同时启动后端（watch）与前端（Vite）
- `npm run dev:server`：启动后端 `server/index.js`
- `npm run dev:client`：启动前端（等价于进入 client 执行 `npm run dev`）
- `npm run db:init`：初始化/创建 SQLite 表结构
- `npm run build`：构建前端（输出到 `client/dist`）
- `npm start`：生产模式启动后端

前端（在 `client/` 下）：

- `npm run dev` / `npm run build` / `npm run preview`

## 配置（环境变量）

后端通过 `dotenv` 加载环境变量（支持 `.env`）。常用配置：

```ini
# .env
PORT=4571
DATABASE_PATH=./data/pixelart.db
LOG_LEVEL=info
NODE_ENV=development
```

- `PORT`：后端端口（默认 4571）
- `DATABASE_PATH`：SQLite 文件路径（默认 `./data/pixelart.db`）
- `LOG_LEVEL`：pino 日志级别（默认 info）
- `NODE_ENV`：development 时启用 `pino-pretty`

## 项目结构

```text
assets/                 MARD 色号数据（colors.txt）
client/                 React + Vite 前端
  src/
    components/         UI 与画布组件（PixelGrid 等）
    pages/              页面（列表/编辑/预览）
    stores/             Zustand 状态（editorStore）
    utils/              API 封装、RLE 等
server/                 Express 后端
  routes/               REST API 路由
  services/             业务逻辑（patterns/tags）
  utils/                RLE、颜色匹配
data/                   SQLite 数据库默认目录
docs/                   设计与路线图
```

## 核心约定（务必了解）

### 1) 双端 RLE 压缩

像素数组在 **API 传输** 与 **数据库存储** 中都使用 RLE 字符串格式：

- 格式：`"count*index,count*index,..."`
- 示例：`"3*0,2*1,1*0"` → `[0,0,0,1,1,0]`

实现位置：

- 前端：`client/src/utils/rle.js`
- 后端：`server/utils/rle.js`

常见坑：编码前确保 `pixels.length === width * height`，否则会出现 `Length mismatch` 相关错误。

### 2) MARD 调色板结构

调色板是一个数组：`[null, 'H1', 'A5', ...]`

- 索引 `0` 永远是 `null`（空色/橡皮擦）
- 其余元素必须是有效的 MARD 色号（见 `assets/colors.txt`，可用 `/api/colors/validate/:code` 验证）

### 3) API 统一响应格式

成功：

```json
{ "success": true, "data": { "...": "..." } }
```

失败：

```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "...", "details": {} } }
```

前端封装：`client/src/utils/api.js` 会自动解包 `data` 或抛出错误。

## API 概览

- `GET /api/health`：健康检查

Patterns（图纸）：

- `GET /api/patterns`：列表（支持 query：`keyword`、`tag`、`page`、`pageSize`、`sort`、`order`）
- `GET /api/patterns/:id`：详情
- `POST /api/patterns`：创建
- `PUT /api/patterns/:id`：更新
- `DELETE /api/patterns/:id`：删除

Tags（标签）：

- `GET /api/tags`：获取全部标签
- `POST /api/tags`：创建标签
- `DELETE /api/tags/:id`：删除标签

Colors（颜色）：

- `GET /api/colors`：获取全部 MARD 颜色
- `GET /api/colors/match?hex=ff0000`：HEX 匹配最近 MARD 色号（不带 #，6 位）
- `GET /api/colors/validate/:code`：验证色号是否存在

## 生产构建与运行

```bash
npm run build
npm start
```

- 前端构建产物：`client/dist`
- 开发模式下前端通过 Vite proxy 访问 `/api` → `http://localhost:4571`
- 生产模式下后端（`server/index.js`）会自动托管 `client/dist` 静态文件，并对前端路由做 SPA 回退（无需额外静态服务器也可运行）

## 使用 PM2 部署（推荐）

生产环境建议：

- 使用 Nginx（或任意静态服务器）托管前端构建产物 `client/dist`
- 使用 PM2 托管后端 API（本项目使用 SQLite，建议先单实例）

### 1) 构建前端

```bash
npm install
cd client && npm install && cd ..

npm run db:init
npm run build
```

### 2) 使用 PM2 启动后端

仓库内已提供 PM2 配置文件：[ecosystem.config.cjs](ecosystem.config.cjs)

```bash
# 全局安装（也可用 pnpm/yarn 或 npx pm2）
npm i -g pm2

# 启动（生产环境变量使用 env_production）
pm2 start ecosystem.config.cjs --env production

# 查看状态/日志
pm2 status
pm2 logs pixel-art-api
```

常用维护命令：

```bash
pm2 restart pixel-art-api
pm2 reload pixel-art-api
pm2 stop pixel-art-api
pm2 delete pixel-art-api

# 开机自启（Linux 常用）
pm2 startup
pm2 save
```

### 3) Nginx 反代示例（API）

你可以让 Nginx 直接提供静态文件，并把 `/api` 反代到后端：

```nginx
server {
  listen 80;
  server_name your-domain.com;

  root /var/www/pixel-art/client/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:4571;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### 4) SQLite 与多实例注意事项

- 后端使用 SQLite（`better-sqlite3`）。在高并发写入场景，多实例/cluster 可能触发锁竞争。
- 建议先使用 `exec_mode: fork` + `instances: 1`（配置已默认如此）。
- 如果确实需要水平扩展，优先考虑：迁移到服务型数据库（PostgreSQL/MySQL），或进行更严格的并发与写入策略评估。

## 常见问题

- 启动时报数据库不存在：先执行 `npm run db:init`
- `Invalid RLE data: Length mismatch`：检查像素数组长度是否等于 `width * height`
- 颜色显示异常（白色/错色）：检查 `pixels` 中的索引是否越界（必须 `< palette.length`）

## 开发文档

- 路线图：`docs/roadmap.md`
- 方案与设计：`docs/plan.md`

## License

MIT
