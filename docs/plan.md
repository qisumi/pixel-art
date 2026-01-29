# 拼豆图纸保存与管理 WebApp 规划

> 目标：构建一个可创建、保存、检索、管理拼豆图纸的 Web 应用。后端使用 Node.js，数据存储使用 SQLite。

---

## 1. 需求与范围

### 1.1 核心目标（MVP）

| 功能领域 | 需求描述 |
|---------|---------|
| **图纸管理** | 用户可创建/编辑/删除拼豆图纸（网格、颜色、名称、描述） |
| **数据持久化** | 图纸可保存到 SQLite 数据库，支持查询、排序、分页浏览 |
| **标签系统** | 支持为图纸添加多个标签，按标签筛选 |
| **搜索功能** | 支持按名称/描述关键词搜索 |
| **只读展示模式** | 手机/平板/其他屏幕上的只读查看，支持缩放与平移，便于边看边拼 |
| **颜色匹配** | 颜色面板支持粘贴 HEX 值，自动匹配最相近的 MARD 色号 |

### 1.2 用户故事

#### 创作者视角
- **US-01**: 作为创作者，我想创建一个指定尺寸的空白图纸，以便开始设计
- **US-02**: 作为创作者，我想从调色板选择颜色并在网格上绘制，以便完成设计
- **US-03**: 作为创作者，我想粘贴任意 HEX 颜色值，系统自动匹配最接近的 MARD 色号，方便采购实体珠子
- **US-04**: 作为创作者，我想保存图纸并添加名称、描述、标签，便于后续查找
- **US-05**: 作为创作者，我想撤销/重做操作，防止误操作
- **US-06**: 作为创作者，我想使用填充工具快速填色大面积区域

#### 浏览者视角
- **US-07**: 作为浏览者，我想搜索并浏览已保存的图纸列表
- **US-08**: 作为浏览者，我想按标签筛选图纸
- **US-09**: 作为浏览者，我想在手机上打开只读模式查看图纸，边看边拼
- **US-10**: 作为浏览者，我想缩放和平移图纸，查看细节

### 1.3 可选增强（Post-MVP）

| 优先级 | 功能 | 描述 |
|-------|------|------|
| P1 | 图片导入 | 导入图片自动像素化为拼豆图纸 |
| P2 | 导出功能 | 导出为 PNG/PDF 打印稿 |
| P3 | 用量统计 | 统计每种颜色珠子的用量 |
| P4 | 分享功能 | 生成分享链接或二维码 |

---

## 2. 技术栈与架构

### 2.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React SPA)                     │
├─────────────┬─────────────┬─────────────┬───────────────────────┤
│  列表页     │   编辑页     │  只读展示   │     颜色匹配器        │
│  PatternList│ PatternEdit │ PatternView │   ColorMatcher        │
└──────┬──────┴──────┬──────┴──────┬──────┴───────────┬───────────┘
       │             │             │                  │
       └─────────────┴─────────────┴──────────────────┘
                              │
                         HTTP REST API
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                    Backend (Node.js + Express)                   │
├─────────────────────────────────────────────────────────────────┤
│  Routes          │  Controllers     │  Services                 │
│  /api/patterns   │  patternCtrl     │  patternService           │
│  /api/tags       │  tagCtrl         │  tagService               │
│  /api/colors     │  colorCtrl       │  colorService             │
└──────────────────┴──────────────────┴────────────┬──────────────┘
                                                   │
┌──────────────────────────────────────────────────┴──────────────┐
│                      Data Layer                                  │
├─────────────────────────────────────────────────────────────────┤
│  better-sqlite3          │  MARD Color Map (assets/colors.txt)  │
│  ./data/pixelart.db      │  221 colors (A1-M15)                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 后端技术栈

| 组件 | 技术选型 | 版本要求 | 说明 |
|------|---------|---------|------|
| 运行时 | Node.js | >= 18 LTS | 使用 ES Modules |
| Web 框架 | Express | ^4.18.x | 成熟稳定，生态丰富 |
| 数据库 | SQLite | 3.x | 单文件，无需额外服务 |
| 数据库驱动 | better-sqlite3 | ^9.x | 同步 API，性能优异 |
| 参数校验 | zod | ^3.x | TypeScript-first 校验库 |
| 环境变量 | dotenv | ^16.x | 配置管理 |
| 日志 | pino | ^8.x | 高性能 JSON 日志 |
| 跨域 | cors | ^2.x | CORS 中间件 |

### 2.3 前端技术栈

| 组件 | 技术选型 | 版本要求 | 说明 |
|------|---------|---------|------|
| 框架 | React | ^18.x | 函数组件 + Hooks |
| 构建工具 | Vite | ^5.x | 快速开发体验 |
| 路由 | React Router | ^6.x | SPA 路由 |
| 状态管理 | Zustand | ^4.x | 轻量级状态管理 |
| HTTP 客户端 | fetch API | 原生 | 无需额外依赖 |
| 样式 | CSS Modules | - | 组件级样式隔离 |
| 图标 | Lucide React | ^0.x | 轻量图标库 |

### 2.4 目录结构

```
pixel-art/
├── assets/
│   └── colors.txt              # MARD 色号映射表 (221 colors)
├── data/
│   └── pixelart.db             # SQLite 数据库文件 (gitignored)
├── docs/
│   └── plan.md                 # 本文档
├── server/                     # 后端代码
│   ├── index.js                # 入口
│   ├── db/
│   │   ├── init.js             # 数据库初始化
│   │   └── migrations/         # 迁移脚本
│   ├── routes/
│   │   ├── patterns.js
│   │   ├── tags.js
│   │   └── colors.js
│   ├── services/
│   │   ├── patternService.js
│   │   ├── tagService.js
│   │   └── colorService.js
│   └── utils/
│       ├── rle.js              # RLE 编解码
│       └── colorMatch.js       # HEX 转 MARD 匹配
├── client/                     # 前端代码
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── PatternListPage.jsx
│   │   │   ├── PatternEditPage.jsx
│   │   │   └── PatternViewPage.jsx
│   │   ├── components/
│   │   │   ├── Grid/
│   │   │   ├── ColorPalette/
│   │   │   ├── Toolbar/
│   │   │   └── common/
│   │   ├── stores/
│   │   │   └── editorStore.js
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── styles/
│   └── index.html
├── package.json
└── .env.example
```

---

## 3. 数据模型（SQLite）

### 3.1 ER 图

```
┌───────────────────┐       ┌───────────────────┐       ┌───────────────────┐
│     patterns      │       │   pattern_tags    │       │       tags        │
├───────────────────┤       ├───────────────────┤       ├───────────────────┤
│ id (PK)           │───┐   │ pattern_id (FK)   │   ┌───│ id (PK)           │
│ name              │   └──>│ tag_id (FK)       │<──┘   │ name (UNIQUE)     │
│ description       │       │ (PK: composite)   │       │ created_at        │
│ width             │       └───────────────────┘       └───────────────────┘
│ height            │
│ palette (JSON)    │
│ data (RLE string) │
│ created_at        │
│ updated_at        │
└───────────────────┘
```

### 3.2 表定义

#### 3.2.1 patterns 表

```sql
CREATE TABLE patterns (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT DEFAULT '',
    width       INTEGER NOT NULL CHECK (width > 0 AND width <= 128),
    height      INTEGER NOT NULL CHECK (height > 0 AND height <= 128),
    palette     TEXT NOT NULL,  -- JSON array: ["A1", "B2", "H7", ...]
    data        TEXT NOT NULL,  -- RLE encoded string
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 索引
CREATE INDEX idx_patterns_name ON patterns(name);
CREATE INDEX idx_patterns_created_at ON patterns(created_at DESC);
CREATE INDEX idx_patterns_updated_at ON patterns(updated_at DESC);
```

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键 |
| name | TEXT | NOT NULL | 图纸名称，1-100 字符 |
| description | TEXT | DEFAULT '' | 图纸描述，最多 500 字符 |
| width | INTEGER | NOT NULL, 1-128 | 网格宽度 |
| height | INTEGER | NOT NULL, 1-128 | 网格高度 |
| palette | TEXT | NOT NULL | JSON 数组，包含使用的 MARD 色号 |
| data | TEXT | NOT NULL | RLE 压缩的颜色索引数据 |
| created_at | TEXT | NOT NULL | 创建时间 ISO8601 |
| updated_at | TEXT | NOT NULL | 更新时间 ISO8601 |

#### 3.2.2 tags 表

```sql
CREATE TABLE tags (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_tags_name ON tags(name);
```

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键 |
| name | TEXT | NOT NULL, UNIQUE | 标签名，1-30 字符 |
| created_at | TEXT | NOT NULL | 创建时间 |

#### 3.2.3 pattern_tags 关联表

```sql
CREATE TABLE pattern_tags (
    pattern_id INTEGER NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    tag_id     INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (pattern_id, tag_id)
);

CREATE INDEX idx_pattern_tags_tag ON pattern_tags(tag_id);
```

### 3.3 数据格式规范

#### 3.3.1 palette 格式

JSON 数组，包含图纸使用的所有 MARD 色号（去重、有序）：

```json
["A1", "B5", "H7", "F2"]
```

- 索引从 0 开始
- 索引 0 通常表示「空/透明」，对应第一个色号
- 所有色号必须存在于 `assets/colors.txt`

#### 3.3.2 RLE 编码规范

**目的**：压缩网格数据，减少存储空间

**扁平化顺序**：按行优先（左→右，上→下）

```
(0,0) (1,0) (2,0) ... (w-1,0)
(0,1) (1,1) (2,1) ... (w-1,1)
...
(0,h-1) ... (w-1,h-1)
```

**编码格式**：`count*index` 用逗号分隔

| 符号 | 含义 |
|------|------|
| count | 连续重复次数 (正整数) |
| * | 分隔符 |
| index | palette 的 0 基索引 |
| , | run 分隔符 |

**示例**

网格 (3x2)：
```
[A1][A1][A1]
[B5][B5][A1]
```

palette: `["A1", "B5"]` (A1=0, B5=1)

扁平化索引: `[0, 0, 0, 1, 1, 0]`

RLE 编码: `3*0,2*1,1*0`

**解码规则**：
1. 按逗号分割得到 runs
2. 解析每个 run 为 `(count, index)`
3. 按顺序展开，累计数量必须等于 `width * height`

**编解码伪代码**

```javascript
// 编码
function encode(flatIndices) {
  const runs = [];
  let i = 0;
  while (i < flatIndices.length) {
    const val = flatIndices[i];
    let count = 1;
    while (i + count < flatIndices.length && flatIndices[i + count] === val) {
      count++;
    }
    runs.push(`${count}*${val}`);
    i += count;
  }
  return runs.join(',');
}

// 解码
function decode(rle, expectedLength) {
  const result = [];
  for (const run of rle.split(',')) {
    const [count, index] = run.split('*').map(Number);
    for (let i = 0; i < count; i++) result.push(index);
  }
  if (result.length !== expectedLength) throw new Error('RLE length mismatch');
  return result;
}
```

---

## 4. API 设计（REST）

### 4.1 基础信息

| 项目 | 值 |
|------|-----|
| Base URL | `/api` |
| Content-Type | `application/json` |
| 编码 | UTF-8 |

### 4.2 通用响应格式

**成功响应**

```json
{
  "success": true,
  "data": { ... }
}
```

**错误响应**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Name is required",
    "details": { ... }
  }
}
```

**错误码**

| Code | HTTP Status | 说明 |
|------|-------------|------|
| VALIDATION_ERROR | 400 | 请求参数校验失败 |
| NOT_FOUND | 404 | 资源不存在 |
| CONFLICT | 409 | 资源冲突（如重复标签名） |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

### 4.3 图纸 API

#### GET /api/patterns

获取图纸列表（分页）

**Query Parameters**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| keyword | string | 否 | - | 搜索关键词（匹配 name 和 description） |
| tag | string | 否 | - | 按标签名筛选 |
| page | number | 否 | 1 | 页码（从 1 开始） |
| pageSize | number | 否 | 20 | 每页条数（1-100） |
| sort | string | 否 | updated_at | 排序字段：created_at, updated_at, name |
| order | string | 否 | desc | 排序方向：asc, desc |

**Response 200**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "name": "皮卡丘",
        "description": "可爱的皮卡丘头像",
        "width": 32,
        "height": 32,
        "tags": ["动漫", "宝可梦"],
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-16T14:20:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

---

#### GET /api/patterns/:id

获取单个图纸详情

**Response 200**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "皮卡丘",
    "description": "可爱的皮卡丘头像",
    "width": 32,
    "height": 32,
    "palette": ["A4", "A8", "H7", "F2"],
    "data": "10*0,5*1,3*2,...",
    "tags": ["动漫", "宝可梦"],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-16T14:20:00Z"
  }
}
```

**Response 404**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Pattern not found"
  }
}
```

---

#### POST /api/patterns

创建新图纸

**Request Body**

```json
{
  "name": "皮卡丘",
  "description": "可爱的皮卡丘头像",
  "width": 32,
  "height": 32,
  "palette": ["A4", "A8", "H7", "F2"],
  "data": "10*0,5*1,3*2,...",
  "tags": ["动漫", "宝可梦"]
}
```

| 字段 | 类型 | 必填 | 校验规则 |
|------|------|------|----------|
| name | string | 是 | 1-100 字符 |
| description | string | 否 | 最多 500 字符 |
| width | number | 是 | 1-128 整数 |
| height | number | 是 | 1-128 整数 |
| palette | string[] | 是 | 非空，元素为有效 MARD 色号 |
| data | string | 是 | 有效 RLE，展开长度 = width * height |
| tags | string[] | 否 | 每个标签 1-30 字符 |

**Response 201**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "皮卡丘",
    ...
  }
}
```

**Response 400**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid palette: color 'X99' not found in MARD colors"
  }
}
```

---

#### PUT /api/patterns/:id

更新图纸

**Request Body** (同 POST，所有字段可选)

```json
{
  "name": "皮卡丘（修改版）",
  "data": "12*0,3*1,..."
}
```

**Response 200** (返回更新后的完整对象)

---

#### DELETE /api/patterns/:id

删除图纸

**Response 204** (无内容)

**Response 404** (图纸不存在)

---

### 4.4 标签 API

#### GET /api/tags

获取所有标签（带使用计数）

**Response 200**

```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "动漫", "count": 15 },
    { "id": 2, "name": "游戏", "count": 8 },
    { "id": 3, "name": "原创", "count": 23 }
  ]
}
```

---

#### POST /api/tags

创建新标签

**Request Body**

```json
{
  "name": "风景"
}
```

**Response 201**

```json
{
  "success": true,
  "data": {
    "id": 4,
    "name": "风景"
  }
}
```

**Response 409** (标签已存在)

---

### 4.5 颜色 API

#### GET /api/colors

获取 MARD 颜色列表

**Response 200**

```json
{
  "success": true,
  "data": [
    { "code": "A1", "hex": "#faf5cd", "group": "A" },
    { "code": "A2", "hex": "#fcfed6", "group": "A" },
    ...
  ]
}
```

---

#### GET /api/colors/match?hex=RRGGBB

根据 HEX 值匹配最相近的 MARD 色号

**Query Parameters**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| hex | string | 是 | 6 位 HEX 颜色（不含 #） |

**Response 200**

```json
{
  "success": true,
  "data": {
    "input": "#ff5733",
    "match": {
      "code": "A10",
      "hex": "#f47e38",
      "distance": 42.5
    },
    "alternatives": [
      { "code": "A7", "hex": "#fa8c4f", "distance": 48.2 },
      { "code": "F13", "hex": "#f45c45", "distance": 51.8 }
    ]
  }
}
```

**匹配算法**：使用 CIEDE2000 色差公式（比 Euclidean RGB 更符合人眼感知）

---

## 5. 编辑器功能规划

### 5.1 功能矩阵

| 功能 | MVP | 描述 |
|------|-----|------|
| 网格画板 | Yes | 可点击/拖拽绘制的像素网格 |
| 网格尺寸选择 | Yes | 预设 + 自定义尺寸 |
| 颜色面板 | Yes | 显示 MARD 色号，支持选择 |
| HEX 粘贴匹配 | Yes | 输入 HEX 自动匹配最近 MARD 色号 |
| 撤销/重做 | Yes | Ctrl+Z / Ctrl+Shift+Z |
| 橡皮擦 | Yes | 清除单个像素 |
| 填充工具 | Yes | 洪水填充连通区域 |
| 缩放 | Yes | 鼠标滚轮/按钮缩放 |
| 平移 | Yes | 拖拽画布平移 |
| 网格辅助线 | Yes | 可开关的网格线 |
| 只读展示模式 | Yes | 移动端友好的查看模式 |
| 颜色拾取器 | No | 从画布吸取颜色 |
| 镜像绘制 | No | 对称绘制 |
| 图层 | No | 多图层支持 |

### 5.2 UI 布局

#### 5.2.1 编辑页布局

```
┌─────────────────────────────────────────────────────────────────┐
│  Header: [返回] [图纸名称输入框] [保存按钮] [更多...]            │
├───────────────┬─────────────────────────────────────────────────┤
│               │                                                  │
│   Toolbar     │              Canvas Area                        │
│   ─────────   │              ────────────                       │
│   [铅笔]      │                                                  │
│   [橡皮]      │         ┌─────────────────────┐                 │
│   [填充]      │         │                     │                 │
│   ─────────   │         │    Pixel Grid       │                 │
│   [撤销]      │         │                     │                 │
│   [重做]      │         │                     │                 │
│   ─────────   │         └─────────────────────┘                 │
│   [网格线]    │                                                  │
│   [缩放+]     │                                                  │
│   [缩放-]     │                                                  │
│               │                                                  │
├───────────────┴─────────────────────────────────────────────────┤
│  Color Palette                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [A组] [B组] [C组] [D组] [E组] [F组] [G组] [H组] [M组]       ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ [■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■][■]...   ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ HEX输入: [#______] [匹配] | 当前: A5 #f0d83a               ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

#### 5.2.2 只读展示模式布局

```
┌─────────────────────────────────────────────────────────────────┐
│  Header: [返回] 图纸名称 [编辑] [全屏]                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                                                                  │
│                    ┌─────────────────────┐                      │
│                    │                     │                      │
│                    │    Pixel Grid       │  ← 支持手势缩放/平移 │
│                    │   (Read-Only)       │                      │
│                    │                     │                      │
│                    └─────────────────────┘                      │
│                                                                  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Palette Legend (收起/展开)                                     │
│  A5: 黄色 | B3: 绿色 | H7: 黑色 ...                            │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 交互规范

#### 5.3.1 绘制交互

| 操作 | 行为 |
|------|------|
| 单击像素 | 使用当前颜色填充该像素 |
| 拖拽 | 连续绘制经过的像素（支持触摸） |
| 右键单击 | 橡皮擦（清除像素） |
| 中键拖拽 | 平移画布 |
| 滚轮 | 缩放画布（以鼠标位置为中心） |
| 双指捏合 (触摸) | 缩放 |
| 双指拖拽 (触摸) | 平移 |

#### 5.3.2 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl + Z | 撤销 |
| Ctrl + Shift + Z / Ctrl + Y | 重做 |
| Ctrl + S | 保存 |
| B | 切换到画笔工具 |
| E | 切换到橡皮擦 |
| G | 切换到填充工具 |
| + / = | 放大 |
| - | 缩小 |
| 0 | 重置缩放 |

#### 5.3.3 HEX 匹配流程

```
用户输入/粘贴 HEX 值 (如 #ff5733)
        │
        ▼
    校验格式 ──(无效)──> 显示错误提示
        │
      (有效)
        ▼
    调用 /api/colors/match
        │
        ▼
    显示匹配结果:
    - 最佳匹配高亮显示
    - 显示 3 个备选项
        │
        ▼
    用户点击选择 ──> 设为当前颜色
```

### 5.4 状态管理 (Zustand Store)

```typescript
interface EditorState {
  // 图纸元数据
  patternId: number | null;
  name: string;
  description: string;
  tags: string[];
  
  // 网格数据
  width: number;
  height: number;
  palette: string[];        // MARD 色号数组
  pixels: number[];         // 扁平化索引数组
  
  // 编辑器状态
  currentTool: 'brush' | 'eraser' | 'fill';
  currentColorIndex: number;
  zoom: number;
  panOffset: { x: number; y: number };
  showGrid: boolean;
  
  // 历史记录
  history: HistoryEntry[];
  historyIndex: number;
  
  // Actions
  setPixel: (x: number, y: number, colorIndex: number) => void;
  fill: (x: number, y: number, colorIndex: number) => void;
  undo: () => void;
  redo: () => void;
  setTool: (tool: Tool) => void;
  setCurrentColor: (index: number) => void;
  addColorToPalette: (mardCode: string) => number;
  zoom: (delta: number, center: Point) => void;
  pan: (delta: Point) => void;
  // ...
}
```

---

## 6. MARD 颜色系统

### 6.1 颜色分组

基于 `assets/colors.txt`，共 **221** 种颜色，分为 **9 组**：

| 组 | 数量 | 色系描述 |
|----|------|---------|
| A | 26 | 黄色、橙色系 |
| B | 32 | 绿色系 |
| C | 29 | 蓝色、青色系 |
| D | 26 | 紫色系 |
| E | 24 | 粉色系 |
| F | 25 | 红色系 |
| G | 21 | 棕色、肤色系 |
| H | 23 | 灰度、中性色 |
| M | 15 | 莫兰迪色系 |

### 6.2 颜色匹配算法

使用 **CIEDE2000** 色差公式，步骤：

1. 将输入 HEX 转换为 Lab 色彩空间
2. 遍历所有 221 种 MARD 颜色
3. 计算每个颜色与输入的 CIEDE2000 距离
4. 返回距离最小的颜色作为最佳匹配
5. 同时返回距离次小的 2-3 个作为备选

**为什么用 CIEDE2000 而不是 RGB 欧氏距离？**

RGB 欧氏距离在感知上不均匀。例如：
- 深蓝色之间的小变化在 RGB 中距离大，但人眼不易区分
- 绿色系的小变化在 RGB 中距离小，但人眼很敏感

CIEDE2000 是国际照明委员会推荐的色差公式，更符合人眼感知。

### 6.3 colors.txt 格式说明

```
A1	#faf5cd
A2	#fcfed6
...
```

- 每行一个颜色
- 格式：`{色号}\t{HEX值}`
- 色号由字母+数字组成
- HEX 为 6 位小写，带 # 前缀

---

## 7. 开发里程碑

### Phase 1：后端 MVP (预计 3 天)

| 任务 | 估时 | 交付物 |
|------|------|--------|
| 1.1 项目初始化 | 2h | package.json, 目录结构, ESLint 配置 |
| 1.2 数据库初始化 | 2h | init.js, 建表脚本, 迁移机制 |
| 1.3 MARD 颜色加载 | 1h | colorService.js, 启动时加载 colors.txt |
| 1.4 颜色匹配 API | 2h | /api/colors, /api/colors/match |
| 1.5 Patterns CRUD | 4h | 完整的增删改查 API |
| 1.6 RLE 编解码 | 2h | rle.js 工具模块，带校验 |
| 1.7 Tags 关联 | 2h | 标签创建、图纸-标签关联 |
| 1.8 搜索与分页 | 2h | keyword 搜索, tag 筛选, 分页 |
| 1.9 单元测试 | 3h | 核心逻辑测试覆盖 |

**验收标准**：
- [ ] 所有 API 端点可通过 Postman/curl 测试
- [ ] RLE 编解码正确性验证   
- [ ] 颜色匹配返回合理结果
- [ ] 无 N+1 查询问题

### Phase 2：前端 MVP (预计 5 天)

| 任务 | 估时 | 交付物 |
|------|------|--------|
| 2.1 项目初始化 | 1h | Vite + React 脚手架 |
| 2.2 路由配置 | 1h | React Router 配置 |
| 2.3 API 客户端 | 2h | fetch 封装, 错误处理 |
| 2.4 图纸列表页 | 4h | 卡片列表, 分页, 搜索, 标签筛选 |
| 2.5 Canvas 网格组件 | 6h | 像素绘制, 缩放, 平移 |
| 2.6 颜色面板组件 | 3h | 分组展示, 选择, HEX 输入 |
| 2.7 工具栏组件 | 2h | 工具切换, 撤销重做 |
| 2.8 编辑器状态管理 | 4h | Zustand store, 历史记录 |
| 2.9 编辑页集成 | 4h | 各组件整合, 保存功能 |
| 2.10 只读展示页 | 4h | 移动端适配, 手势支持 |
| 2.11 样式打磨 | 4h | 响应式布局, 暗色模式 |
| 2.12 基础测试 | 2h | 关键交互测试 |

**验收标准**：
- [ ] 可完成完整的创建→编辑→保存→查看流程
- [ ] 手机浏览器可正常使用只读模式
- [ ] 撤销/重做工作正常
- [ ] HEX 匹配功能可用

### Phase 3：打磨与增强 (预计 2 天)

| 任务 | 估时 | 交付物 |
|------|------|--------|
| 3.1 性能优化 | 3h | Canvas 渲染优化, 虚拟化列表 |
| 3.2 离线支持 | 3h | Service Worker, 本地草稿 |
| 3.3 键盘快捷键完善 | 2h | 全局快捷键支持 |
| 3.4 触摸手势完善 | 2h | 双指缩放/平移优化 |
| 3.5 错误处理 | 2h | 友好错误提示, 自动恢复 |
| 3.6 部署配置 | 2h | 构建脚本, 部署文档 |

---

## 8. 风险与缓解策略

| 风险 | 影响 | 可能性 | 缓解策略 |
|------|------|--------|---------|
| SQLite 并发写入瓶颈 | 中 | 低 | MVP 单用户足够；后续可迁移 PostgreSQL |
| 大尺寸图纸性能问题 | 高 | 中 | 限制最大尺寸 128x128；Canvas 离屏渲染 |
| RLE 编解码错误 | 高 | 中 | 充分单测；保存时校验 |
| 颜色映射表变更 | 中 | 低 | 版本化 colors.txt；数据库记录使用的版本 |
| 移动端触摸体验差 | 中 | 中 | 使用成熟手势库；充分真机测试 |
| 浏览器兼容性 | 低 | 低 | 目标 Chrome/Safari/Firefox 最新版 |

---

## 9. 非功能性需求

### 9.1 性能

| 指标 | 目标 |
|------|------|
| 首屏加载 | < 2s (4G 网络) |
| 列表页渲染 | < 100ms (50 条记录) |
| 画布绘制响应 | < 16ms (60fps) |
| API 响应时间 | < 200ms (p95) |

### 9.2 可用性

- 支持键盘导航
- 颜色对比度满足 WCAG AA
- 触摸目标最小 44x44px

### 9.3 兼容性

| 平台 | 最低版本 |
|------|---------|
| Chrome | 90+ |
| Safari | 14+ |
| Firefox | 90+ |
| iOS Safari | 14+ |
| Android Chrome | 90+ |

---

## 10. 下一步行动

1. **确认** MVP 功能范围无遗漏
2. **启动** Phase 1 后端开发
3. **并行** 设计稿细化（如需要）
4. **建立** 项目结构与初始脚手架

---

## 附录

### A. 参考资源

- [CIEDE2000 色差公式](https://en.wikipedia.org/wiki/Color_difference#CIEDE2000)
- [better-sqlite3 文档](https://github.com/WiseLibs/better-sqlite3)
- [Zustand 文档](https://github.com/pmndrs/zustand)

### B. 术语表

| 术语 | 定义 |
|------|------|
| MARD | 拼豆珠子的品牌色号系统 |
| RLE | Run-Length Encoding，游程编码 |
| Palette | 调色板，图纸使用的颜色集合 |
| Pattern | 图纸/图案 |
