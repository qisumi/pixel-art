# Pixel Art Editor - Development Roadmap

> 剩余工作清单及分步实施指南 (更新于 2026-01-29)

---

## 项目完成状态概览

### ✅ 已完成模块

| 模块 | 状态 | 说明 |
|------|------|------|
| **后端核心** | ✅ 完成 | Express 服务器、数据库初始化、CRUD API |
| **数据库** | ✅ 完成 | SQLite 表结构、索引、外键约束 |
| **MARD 颜色系统** | ✅ 完成 | 221 色加载、CIEDE2000 匹配算法、API 端点 |
| **RLE 编解码** | ✅ 完成 | 前后端双端实现、验证功能 |
| **标签系统** | ✅ 完成 | 多对多关联、筛选功能 |
| **前端框架** | ✅ 完成 | Vite + React + Router + Zustand |
| **图纸列表页** | ✅ 完成 | 搜索、标签筛选、分页、卡片展示 |
| **基础 UI 组件** | ✅ 完成 | 按钮、卡片、标签、输入框 |
| **编辑器状态管理** | ✅ 完成 | editorStore 包含工具/历史/绘制状态 |
| **Canvas 网格组件** | ✅ 完成 | PixelGrid 基于 React-Konva |
| **Canvas 渲染优化** | ✅ 完成 | 离屏 Canvas + ImageData 批量渲染 |
| **useColorMap Hook** | ✅ 完成 | 颜色数据缓存与 O(1) 查询 |
| **编辑页 Canvas 集成** | ✅ 完成 | 绘制事件、工具切换、撤销/重做、保存 |
| **只读预览页 Canvas** | ✅ 完成 | PatternViewPage 集成 PixelGrid readonly 模式 |
| **HiDPI 支持** | ✅ 完成 | Canvas 锐利渲染、devicePixelRatio 处理 |
| **绘制历史批处理** | ✅ 完成 | 拖拽绘制整笔撤销，避免历史栈溢出 |
| **滚轮缩放优化** | ✅ 完成 | RAF 节流、平滑缩放体验 |
| **平移拖拽** | ✅ 完成 | Alt+拖拽、中键拖拽、RAF 优化 |
| **触摸手势支持** | ✅ 完成 | 双指平移、单指绘制、手势检测 |
| **自动适配视图** | ✅ 完成 | 初始加载时 fitToScreen |
| **HEX 颜色匹配 UI** | ✅ 完成 | HexMatcher 组件 + 改进的 ColorPicker |
| **键盘快捷键** | ✅ 完成 | Ctrl+Z/S, B/E/G 工具切换, +/- 缩放 |
| **离开确认提示** | ✅ 完成 | isDirty 检测 + beforeunload |
| **错误提示优化** | ✅ 完成 | Toast/Snackbar 组件替代 alert |
| **删除确认对话框** | ✅ 完成 | 删除图纸前二次确认 |
| **图纸卡片缩略图** | ✅ 完成 | 列表页显示预览图 |

### ⏳ 待完成模块 (MVP)

| 模块 | 优先级 | 估时 | 说明 |
|------|--------|------|------|

### 🔮 后续增强 (Post-MVP)

| 模块 | 优先级 | 估时 | 说明 |
|------|--------|------|------|
| **移动端工具栏适配** | P2 | 1.5h | 响应式布局优化 |
| **图纸导出功能** | P3 | 3h | 导出为 PNG/PDF |
| **用量统计** | P3 | 2h | 统计每种颜色珠子数量 |
| **图片导入** | P3 | 4-5h | 导入图片自动像素化 |

---

## 🎯 下一步工作

### 阶段 1: 图纸卡片缩略图 (P1)

> **目标**: 列表页显示图纸预览

### 1.1 修改 API 返回数据

**文件**: `server/services/patternService.js`

```javascript
// 在 listPatterns 的 items.map 中添加:
const items = listStmt.all(...params, pageSize, offset).map(p => ({
  id: p.id,
  name: p.name,
  description: p.description,
  width: p.width,
  height: p.height,
  palette: JSON.parse(p.palette),  // 新增
  data: p.data,                     // 新增
  tags: getPatternTags(p.id),
  createdAt: p.created_at,
  updatedAt: p.updated_at,
}));
```

### 1.2 创建缩略图组件

**文件**: `client/src/components/PatternThumbnail.jsx`

```jsx
function PatternThumbnail({ width, height, pixels, palette, size = 120 }) {
  const canvasRef = useRef(null);
  const { getHex } = useColorMap();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pixels.length) return;

    const ctx = canvas.getContext('2d');
    const pixelSize = size / Math.max(width, height);

    ctx.fillStyle = '#1a1a25';
    ctx.fillRect(0, 0, size, size);

    const offsetX = (size - width * pixelSize) / 2;
    const offsetY = (size - height * pixelSize) / 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const colorCode = palette[pixels[idx]];
        ctx.fillStyle = colorCode ? getHex(colorCode) : '#1a1a25';
        ctx.fillRect(offsetX + x * pixelSize, offsetY + y * pixelSize, pixelSize, pixelSize);
      }
    }
  }, [width, height, pixels, palette, size, getHex]);

  return <canvas ref={canvasRef} width={size} height={size} />;
}
```

### 2.3 验收标准

- [ ] 列表页每个卡片显示缩略图
- [ ] 缩略图居中显示
- [ ] 加载性能良好

---

## 阶段 3: 离开确认提示 (已完成)

### 3.1 实现 beforeunload 检测

```javascript
// PatternEditPage.jsx
useEffect(() => {
  function handleBeforeUnload(e) {
    if (store.isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  }
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [store.isDirty]);
```

### 3.2 验收标准

- [x] 编辑未保存时离开页面有提示
- [x] 保存后 isDirty 重置
- [x] 路由跳转也触发确认

---

## 文件状态清单

## 📋 核心文件清单

### ✅ 已完成文件

| 文件路径 | 状态 | 说明 |
|----------|------|------|
| `server/index.js` | ✅ | Express 服务器入口 |
| `server/db/init.js` | ✅ | SQLite 数据库初始化 |
| `server/routes/patterns.js` | ✅ | 图案 CRUD 路由 |
| `server/routes/tags.js` | ✅ | 标签路由 |
| `server/routes/colors.js` | ✅ | 颜色匹配路由 |
| `server/services/patternService.js` | ✅ | 图案业务逻辑 |
| `server/services/tagService.js` | ✅ | 标签业务逻辑 |
| `server/utils/rle.js` | ✅ | RLE 编解码 (后端) |
| `server/utils/colorMatch.js` | ✅ | CIEDE2000 颜色匹配 |
| `client/src/App.jsx` | ✅ | React 路由配置 |
| `client/src/pages/PatternListPage.jsx` | ✅ | 图纸列表页 |
| `client/src/pages/PatternEditPage.jsx` | ✅ | 图纸编辑页 |
| `client/src/pages/PatternViewPage.jsx` | ✅ | 只读预览页 (已集成 Canvas) |
| `client/src/components/PixelGrid/PixelGrid.jsx` | ✅ | Canvas 网格组件 (含触摸手势) |
| `client/src/components/PixelGrid/index.js` | ✅ | PixelGrid 导出 |
| `client/src/stores/editorStore.js` | ✅ | Zustand 编辑器状态 |
| `client/src/hooks/useColorMap.js` | ✅ | 颜色数据缓存 Hook |
| `client/src/utils/api.js` | ✅ | API 请求封装 |
| `client/src/utils/rle.js` | ✅ | RLE 编解码 (前端) |
| `client/src/components/HexMatcher/HexMatcher.jsx` | ✅ | HEX 颜色匹配组件 |
| `client/src/components/HexMatcher/index.js` | ✅ | HexMatcher 导出 |
| `client/src/components/ColorPicker/ColorPicker.jsx` | ✅ | 改进的颜色选择器 |
| `client/src/components/ColorPicker/index.js` | ✅ | ColorPicker 导出 |
| `client/src/hooks/useKeyboardShortcuts.js` | ✅ | 键盘快捷键 Hook |

### ⏳ 待创建文件

| 文件路径 | 优先级 | 说明 |
|----------|--------|------|
| `client/src/components/PatternThumbnail/PatternThumbnail.jsx` | P1 | 缩略图组件 |
| `client/src/components/PatternThumbnail/index.js` | P1 | PatternThumbnail 导出 |
---

## 快速启动

```bash
# 安装依赖
npm install
cd client && npm install && cd ..

# 初始化数据库
npm run db:init

# 开发模式
npm run dev

# 访问
# 前端: http://localhost:5173
# 后端: http://localhost:3001
```
