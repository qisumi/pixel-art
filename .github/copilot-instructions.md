# Pixel Art Editor - AI Coding Agent Instructions

## 项目概览

拼豆图纸编辑与管理 Web 应用 (Perler/Fuse Beads Pattern Editor)。支持创建、编辑、保存和浏览像素艺术图案，并提供 MARD 色号系统匹配。

**技术栈**: Node.js (Express) + SQLite + React + Vite + Konva (Canvas) + Zustand

## 关键架构理念

### 1. 双端 RLE 压缩

**位置**: `server/utils/rle.js` + `client/src/utils/rle.js`

像素数据使用行程编码 (Run-Length Encoding) 压缩存储和传输:
```javascript
// Format: "count*index,count*index,..."
// Example: "3*0,2*1,1*0" → [0,0,0,1,1,0]
encode([0,0,0,1,1,0]) // → "3*0,2*1,1*0"
decode("3*0,2*1,1*0", 6) // → [0,0,0,1,1,0]
```

**原则**: 
- 前后端必须保持 RLE 实现一致
- 所有图案数据在 API 传输和数据库存储时均为 RLE 格式
- 前端解码后才能渲染；编辑完成后编码再保存

### 2. MARD 颜色系统

**位置**: `assets/colors.txt` (221种色号) + `server/utils/colorMatch.js`

- **Palette 结构**: `[null, 'H1', 'A5', ...]` — 索引 0 始终为空色/橡皮擦
- **颜色匹配**: 使用 CIEDE2000 算法匹配最接近的 MARD 色号
  ```javascript
  // API: GET /api/colors/match?hex=ff0000
  // 返回: { code: 'H1', hex: '#e13f43', distance: 12.5 }
  ```
- **验证**: 所有调色板色号必须在 MARD 221色中 (`isValidColorCode()`)

### 3. Canvas 渲染架构

**位置**: `client/src/components/PixelGrid/PixelGrid.jsx`

使用 React-Konva 构建高性能像素网格:

```
Konva Stage (视口)
  └─ Layer
       ├─ Image (离屏 Canvas 位图) ← 实际像素数据
       └─ Lines (网格线，可选)
```

**性能优化**:
- **双 Canvas 架构**: 离屏 Canvas 绘制像素 → Konva Image 节点显示
- **批量渲染**: `paletteRgb` 预计算颜色 RGB → `ImageData` 直接写入
- **HiDPI 支持**: `window.devicePixelRatio` 缩放确保清晰度
- **RAF 节流**: 滚轮缩放和拖拽平移使用 `requestAnimationFrame` 防止卡顿

**交互逻辑**:
- 滚轮缩放 (Ctrl + 滚轮)
- Alt/中键拖拽平移
- 左键绘制 (画笔/橡皮/填充工具)

### 4. Zustand 编辑器状态

**位置**: `client/src/stores/editorStore.js`

单一状态源管理图纸编辑:
```javascript
{
  patternId, name, description, tags,  // 元数据
  width, height, palette, pixels,      // 图案数据
  currentTool, currentColorIndex,      // 工具状态
  zoom, panOffset, showGrid,           // 视图状态
  history, historyIndex,               // 撤销/重做栈
  isDirty, isDrawing                   // 编辑状态
}
```

**关键方法**:
- `initNew(width, height)` — 新建空白图纸
- `loadPattern(pattern)` — 从 API 加载 (自动 RLE 解码)
- `saveCurrentState()` — 推入历史栈
- `setPixel(x, y, colorIndex)` — 绘制单个像素
- `floodFill(x, y)` — 区域填充 (深度优先搜索)
- `undo() / redo()` — 历史导航

**重要**: 绘制操作要先 `saveCurrentState()` 再修改 `pixels`，确保可撤销。

### 5. API 响应格式

所有端点返回统一结构:
```javascript
// Success
{ success: true, data: { ... } }

// Error
{ success: false, error: { code: 'ERROR_CODE', message: '...', details: {} } }
```

**客户端封装**: `client/src/utils/api.js` 自动解包 `data` 或抛出错误

## 关键工作流

### 开发环境启动

```bash
# 根目录 - 同时启动前后端
npm run dev  # → concurrently dev:server + dev:client

# 或分别启动
npm run dev:server  # → node --watch server/index.js (port 3001)
npm run dev:client  # → vite dev (port 5173, proxy /api → 3001)

# 首次运行需初始化数据库
npm run db:init  # → 创建 data/pixelart.db
```

**Vite 代理配置**: `client/vite.config.js` 中 `/api` 请求代理到 `localhost:3001`

### 数据库管理

**位置**: `server/db/init.js`

- **路径**: `data/pixelart.db` (可通过 `DATABASE_PATH` 环境变量覆盖)
- **表结构**: `patterns`, `tags`, `pattern_tags` (多对多关联)
- **外键约束**: 启用 `PRAGMA foreign_keys = ON`
- **迁移**: 目前无迁移系统，直接在 `init.js` 修改 schema (未来考虑 `migrations/` 目录)

### 构建与部署

```bash
npm run build        # → vite build (输出到 client/dist)
npm start            # → node server/index.js (生产模式)
```

**环境变量** (`.env`):
```
PORT=3001
DATABASE_PATH=./data/pixelart.db
LOG_LEVEL=info
NODE_ENV=production
```

## 项目特定约定

### 文件命名与导入

- **ES Modules**: 所有文件使用 `.js` 扩展名 (React 组件是 `.jsx`)
- **显式扩展名**: `import ... from './file.js'` (必须包含 `.js`)
- **路径别名**: 无，使用相对路径

### 组件结构

```
components/
  ComponentName/
    index.js          ← 导出组件
    ComponentName.jsx ← 组件实现
    ComponentName.css ← 样式 (可选)
```

### API 路由与服务分离

**模式**: Router → Service → Database

```javascript
// routes/patterns.js
router.get('/:id', (req, res) => {
  const pattern = patternService.getPattern(req.params.id);
  res.json({ success: true, data: pattern });
});

// services/patternService.js
export function getPattern(id) {
  const row = db.prepare('SELECT * FROM patterns WHERE id = ?').get(id);
  // ... 处理 tags、RLE 解码等
  return pattern;
}
```

### 错误处理

- **Zod 验证**: 后端使用 Zod schema 验证请求体 (计划中，目前手动验证)
- **服务层抛出错误**: `throw new Error('...')` → Express 错误处理器捕获
- **前端 try-catch**: 调用 `api.*` 方法时捕获错误显示提示

### 日志记录

使用 Pino:
```javascript
logger.info({ method, url }, 'incoming request');
logger.error(err, 'unhandled error');
```

开发模式自动启用 `pino-pretty` 彩色输出。

## 待办事项 (Roadmap 2026-01-28)

**P0 - 下一步**:
- 键盘快捷键 (Ctrl+Z/S, B/E/G 工具切换)

**P1 - 近期**:
- 图纸缩略图 (列表页卡片显示预览)
- 离开确认提示 (`isDirty` 检测)

**P2 - 后续**:
- 错误提示优化 (Toast 替代 alert)
- 删除确认对话框

详见 `docs/roadmap.md`

## 常见陷阱

### RLE 长度不匹配

**症状**: API 返回 `Invalid RLE data: Length mismatch`

**原因**: 编辑器 `pixels` 数组长度 ≠ `width * height`

**解决**: 调用 `encode()` 前检查 `pixels.length === width * height`

### Canvas 模糊 (HiDPI)

**症状**: 高分辨率屏幕上像素边缘模糊

**原因**: 未考虑 `devicePixelRatio`

**解决**: PixelGrid 已处理，离屏 Canvas 自动缩放

### 历史栈溢出

**症状**: 频繁拖拽绘制导致内存增长

**原因**: 每次 `setPixel()` 都调用 `saveCurrentState()`

**解决**: 已实现批处理 — `onDrawStart` 保存状态，`onDrawEnd` 结束批次

### 调色板索引越界

**症状**: 渲染白色或错误颜色

**原因**: `pixels` 中索引 > `palette.length`

**解决**: 确保所有绘制操作使用 `currentColorIndex` 且 `< palette.length`

## 参考文档

- **项目规划**: `docs/plan.md` (完整技术方案、数据库 schema)
- **开发路线**: `docs/roadmap.md` (当前进度、待办清单)
- **颜色数据**: `assets/colors.txt` (MARD 221色号列表)

## 代码审查检查清单

在提交代码前确认:

- [ ] RLE 数据长度与 `width * height` 匹配
- [ ] 调色板色号已通过 `isValidColorCode()` 验证
- [ ] 前端修改 `pixels` 前已调用 `saveCurrentState()` (可撤销操作)
- [ ] API 响应使用 `{ success, data/error }` 格式
- [ ] 导入路径包含 `.js` 扩展名
- [ ] 新增颜色相关功能使用 `useColorMap` Hook (避免重复请求)
