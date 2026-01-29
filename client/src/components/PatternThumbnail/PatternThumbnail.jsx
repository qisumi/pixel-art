import { useRef, useEffect } from 'react';
import { decode } from '../../utils/rle.js';
import { useColorMap } from '../../hooks/useColorMap.js';

/**
 * 图纸缩略图组件 - 使用 Canvas 渲染像素预览
 * @param {Object} props
 * @param {number} props.width - 图纸宽度 (像素数)
 * @param {number} props.height - 图纸高度 (像素数)
 * @param {string} props.data - RLE 编码的像素数据
 * @param {Array} props.palette - 调色板 [null, 'H1', 'A5', ...]
 * @param {number} props.size - 缩略图尺寸 (默认 120px)
 */
function PatternThumbnail({ width, height, data, palette, size = 120 }) {
  const canvasRef = useRef(null);
  const { getHex, loading: colorLoading } = useColorMap();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || colorLoading || !data) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // 设置 HiDPI 支持
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    // 解码 RLE 数据
    const pixels = decode(data, width * height);

    // 计算像素大小，保持宽高比
    const pixelSize = (size - 2) / Math.max(width, height); // 留 1px padding
    const offsetX = (size - width * pixelSize) / 2;
    const offsetY = (size - height * pixelSize) / 2;

    // 填充背景
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, size, size);

    // 绘制像素
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const colorIndex = pixels[idx];
        const colorCode = palette[colorIndex];

        // 空像素绘制浅灰色格子背景
        if (!colorCode) {
          ctx.fillStyle = (x + y) % 2 === 0 ? '#e8e8e8' : '#f5f5f5';
        } else {
          ctx.fillStyle = getHex(colorCode);
        }
        ctx.fillRect(
          offsetX + x * pixelSize,
          offsetY + y * pixelSize,
          pixelSize,
          pixelSize
        );
      }
    }
  }, [width, height, data, palette, size, getHex, colorLoading]);

  return (
    <canvas
      ref={canvasRef}
      className="pattern-thumbnail"
      style={{
        display: 'block',
        borderRadius: '8px',
      }}
    />
  );
}

export default PatternThumbnail;
