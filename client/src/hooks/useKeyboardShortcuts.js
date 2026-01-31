import { useEffect } from 'react';
import { useEditorStore } from '../stores/editorStore.js';

export function useKeyboardShortcuts({ onSave }) {
  const store = useEditorStore();

  useEffect(() => {
    function handleKeyDown(e) {
      // 忽略输入框内的按键
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Ctrl+Z: 撤销
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        store.undo();
        return;
      }
      
      // Ctrl+Shift+Z / Ctrl+Y: 重做
      if ((e.ctrlKey || e.metaKey) && ((e.shiftKey && e.key === 'z') || e.key === 'y')) {
        e.preventDefault();
        store.redo();
        return;
      }
      
      // Ctrl+S: 保存
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
        return;
      }
      
      // B: 画笔
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        store.setTool('brush');
        return;
      }
      
      // E: 橡皮
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        store.setTool('eraser');
        return;
      }

      // F: 填充工具
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        store.setTool('fill');
        return;
      }

      // L: 切换锁定模式
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        store.toggleLockMode();
        return;
      }

      // Shift + Arrow: 平移图像
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          store.shiftCanvas(0, -1);
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          store.shiftCanvas(0, 1);
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          store.shiftCanvas(-1, 0);
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          store.shiftCanvas(1, 0);
          return;
        }
      }
      
      // +/=: 放大
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        const newZoom = Math.min(store.zoom + 0.25, 10);
        store.setZoom(newZoom);
        return;
      }
      
      // -: 缩小
      if (e.key === '-') {
        e.preventDefault();
        const newZoom = Math.max(store.zoom - 0.25, 0.25);
        store.setZoom(newZoom);
        return;
      }
      
      // 0: 重置缩放
      if (e.key === '0') {
        e.preventDefault();
        store.fitToScreen();
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store, onSave]);
}
