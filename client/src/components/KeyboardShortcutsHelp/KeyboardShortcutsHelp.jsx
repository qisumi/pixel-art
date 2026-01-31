import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Keyboard, X } from 'lucide-react';
import './KeyboardShortcutsHelp.css';

export function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  const shortcuts = [
    {
      category: '编辑',
      items: [
        { keys: ['Ctrl', 'Z'], description: '撤销' },
        { keys: ['Ctrl', 'Shift', 'Z'], description: '重做' },
        { keys: ['Ctrl', 'Y'], description: '重做（替代）' },
        { keys: ['Ctrl', 'S'], description: '保存图纸' },
      ]
    },
    {
      category: '工具',
      items: [
        { keys: ['B'], description: '画笔工具' },
        { keys: ['E'], description: '橡皮擦' },
        { keys: ['F'], description: '填充工具（油漆桶）' },
        { keys: ['H'], description: '手指工具（拖动画布）' },
      ]
    },
    {
      category: '模式',
      items: [
        { keys: ['L'], description: '切换锁定/解锁模式' },
        { keys: ['H'], description: '切换手指工具（拖动画布）' },
        { keys: ['🔒', '锁定'], description: '锁定模式：只能在空白格子上色' },
        { keys: ['🔓', '解锁'], description: '普通模式：可在任意格子上色' },
        { keys: ['👆', '手指'], description: '手指工具：单指拖动平移画布' },
      ]
    },
    {
      category: '视图',
      items: [
        { keys: ['+'], description: '放大' },
        { keys: ['='], description: '放大（替代）' },
        { keys: ['-'], description: '缩小' },
        { keys: ['0'], description: '自动适配视图' },
      ]
    },
    {
      category: '变换',
      items: [
        { keys: ['Shift', '↑'], description: '图像上移 1 像素' },
        { keys: ['Shift', '↓'], description: '图像下移 1 像素' },
        { keys: ['Shift', '←'], description: '图像左移 1 像素' },
        { keys: ['Shift', '→'], description: '图像右移 1 像素' },
      ]
    },
    {
      category: '导航',
      items: [
        { keys: ['Alt', '拖拽'], description: '平移画布（桌面）' },
        { keys: ['中键', '拖拽'], description: '平移画布（桌面替代）' },
        { keys: ['双指', '拖动'], description: '平移画布（移动端）' },
        { keys: ['手指工具', '单指'], description: '单指拖动平移（移动端）' },
        { keys: ['Ctrl', '滚轮'], description: '缩放' },
      ]
    }
  ];

  return (
    <>
      <button 
        className="btn glass-button btn-icon" 
        onClick={() => setIsOpen(true)}
        title="键盘快捷键"
      >
        <Keyboard size={20} />
      </button>

      {isOpen && createPortal(
        <div className="shortcuts-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="shortcuts-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="shortcuts-modal-header">
              <h2>
                <Keyboard size={24} />
                键盘快捷键
              </h2>
              <button 
                className="btn glass-button btn-icon" 
                onClick={() => setIsOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="shortcuts-modal-content">
              {shortcuts.map((category, idx) => (
                <div key={idx} className="shortcuts-category">
                  <h3>{category.category}</h3>
                  <div className="shortcuts-list">
                    {category.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="shortcuts-item">
                        <div className="shortcuts-keys">
                          {item.keys.map((key, keyIdx) => (
                            <span key={keyIdx}>
                              <kbd>{key}</kbd>
                              {keyIdx < item.keys.length - 1 && <span className="shortcuts-plus">+</span>}
                            </span>
                          ))}
                        </div>
                        <div className="shortcuts-description">{item.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="shortcuts-modal-footer">
              <p className="shortcuts-note">
                💡 在 Mac 上使用 <kbd>Cmd</kbd> 替代 <kbd>Ctrl</kbd>
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
