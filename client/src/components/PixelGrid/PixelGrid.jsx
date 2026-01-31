import { useRef, useState, useCallback, useEffect, useMemo, useLayoutEffect } from 'react';
import { Stage, Layer, Rect, Line, Image, Group, Text } from 'react-konva';
import { useColorMap } from '../../hooks/useColorMap.js';

const BASE_PIXEL_SIZE = 16;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
const GRID_LINE_COLOR = 'rgba(0, 0, 0, 0.05)';
const EMPTY_COLOR = 'transparent';

function hexToRgb(hex) {
  if (!hex) return [0, 0, 0];
  let value = hex.startsWith('#') ? hex.slice(1) : hex;
  if (value.length === 3) {
    value = value.split('').map((ch) => ch + ch).join('');
  }
  if (value.length !== 6) return [0, 0, 0];
  const num = Number.parseInt(value, 16);
  if (Number.isNaN(num)) return [0, 0, 0];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function PixelGrid({
  width,
  height,
  pixels,
  palette,
  zoom = 1,
  panOffset = { x: 0, y: 0 },
  touchPanMode = 'double',
  showGrid = true,
  showCodes = false,
  showCodesMinZoom = 0.6,
  highlightCode = null,
  currentTool = 'brush',
  currentColorIndex = 0,
  readonly = false,
  onPixelClick,
  onPixelDrag,
  onDrawStart,
  onDrawEnd,
  onZoom,
  onPan,
  onContainerResize,
}) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const pixelCanvasRef = useRef(null);
  const [pixelImage, setPixelImage] = useState(null);
  const imageRef = useRef(null);
  const activeEraserRef = useRef(false);
  const initialViewportSize = useMemo(() => {
    if (typeof window === 'undefined') return { width: 0, height: 0 };
    return { width: window.innerWidth, height: window.innerHeight };
  }, []);
  // Keep last size at 0x0 so we always notify parents at least once.
  const lastContainerSizeRef = useRef({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState(initialViewportSize);
  // Avoid re-running the measurement effect when parent recreates callbacks every render.
  const onContainerResizeRef = useRef(onContainerResize);
  useEffect(() => {
    onContainerResizeRef.current = onContainerResize;
  }, [onContainerResize]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPos, setLastPos] = useState(null);
  const [lastPointerPos, setLastPointerPos] = useState(null);
  const [localStagePosition, setLocalStagePosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const { getHex, loading } = useColorMap();
  const stagePosition = localStagePosition;
  const scaleRef = useRef(scale);
  const panRef = useRef(localStagePosition);
  const wheelRafRef = useRef(null);
  const pendingWheelRef = useRef({ delta: 0, pointer: null });
  const panRafRef = useRef(null);
  const pendingPanRef = useRef(null);
  const isWheelZoomingRef = useRef(false);
  const wheelEndTimeoutRef = useRef(null);
  const hasUserPannedRef = useRef(false);
  const pinchRef = useRef(null);
  const allowSingleFingerPan = touchPanMode === 'single';
  const resolvedContainerSize = useMemo(() => {
    const safeWidth = Number.isFinite(containerSize.width) ? Math.round(containerSize.width) : 0;
    const safeHeight = Number.isFinite(containerSize.height) ? Math.round(containerSize.height) : 0;
    return {
      width: Math.max(1, safeWidth),
      height: Math.max(1, safeHeight),
    };
  }, [containerSize.width, containerSize.height]);

  const paletteRgb = useMemo(() => {
    const length = Math.max(palette.length, 1);
    const rgb = new Array(length);
    rgb[0] = null;
    for (let i = 1; i < palette.length; i += 1) {
      const hex = getHex(palette[i]);
      rgb[i] = hex ? hexToRgb(hex) : null;
    }
    return rgb;
  }, [palette, getHex]);

  const paletteTextColor = useMemo(() => {
    const length = Math.max(palette.length, 1);
    const colors = new Array(length);
    colors[0] = null;
    for (let i = 1; i < palette.length; i += 1) {
      const rgb = paletteRgb[i];
      if (!rgb) {
        colors[i] = null;
        continue;
      }
      const luminance = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
      colors[i] = luminance >= 0.6 ? '#111827' : '#f8fafc';
    }
    return colors;
  }, [palette.length, paletteRgb]);

  const codeLabels = useMemo(() => {
    if (!showCodes || scale < showCodesMinZoom) return [];
    if (!Array.isArray(pixels) || !Array.isArray(palette)) return [];
    const labels = [];
    const pixelCount = width * height;
    for (let i = 0; i < pixelCount; i += 1) {
      const colorIndex = pixels[i] ?? 0;
      if (!colorIndex) continue;
      const code = palette[colorIndex];
      if (!code) continue;
      if (highlightCode && code !== highlightCode) continue;
      const textColor = paletteTextColor[colorIndex];
      if (!textColor) continue;
      const x = i % width;
      const y = Math.floor(i / width);
      labels.push({
        key: `${i}-${code}`,
        text: code,
        x: x * BASE_PIXEL_SIZE,
        y: y * BASE_PIXEL_SIZE,
        fill: textColor,
      });
    }
    return labels;
  }, [showCodes, showCodesMinZoom, scale, pixels, palette, paletteTextColor, width, height, highlightCode]);

  // Ensure the Konva <Image> gets a stable canvas reference on the very first render.
  // (Assigning to a ref doesn't trigger a re-render, so without this the image can stay blank
  // until some unrelated interaction causes a render.)
  useEffect(() => {
    if (pixelImage) return;
    if (pixelCanvasRef.current) {
      setPixelImage(pixelCanvasRef.current);
      return;
    }
    const canvas = document.createElement('canvas');
    pixelCanvasRef.current = canvas;
    setPixelImage(canvas);
  }, [pixelImage]);

  useEffect(() => {
    if (loading) return;
    if (!Number.isFinite(width) || !Number.isFinite(height)) return;
    if (width <= 0 || height <= 0) return;

    const pixelCount = width * height;
    let canvas = pixelCanvasRef.current;

    if (!canvas) {
      canvas = document.createElement('canvas');
      pixelCanvasRef.current = canvas;
      setPixelImage(canvas);
    }

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let i = 0; i < pixelCount; i += 1) {
      const colorIndex = pixels[i] ?? 0;
      const offset = i * 4;
      if (!colorIndex) {
        data[offset + 3] = 0;
        continue;
      }
      const rgb = paletteRgb[colorIndex];
      if (!rgb) {
        data[offset + 3] = 0;
        continue;
      }
      const code = palette?.[colorIndex];
      const isDimmed = highlightCode && code && code !== highlightCode;
      data[offset] = rgb[0];
      data[offset + 1] = rgb[1];
      data[offset + 2] = rgb[2];
      data[offset + 3] = isDimmed ? 70 : 255;
    }

    ctx.putImageData(imageData, 0, 0);
    // Update Konva image immediately even if React hasn't re-rendered yet.
    if (imageRef.current && pixelCanvasRef.current) {
      imageRef.current.image(pixelCanvasRef.current);
    }
    imageRef.current?.getLayer()?.batchDraw();
  }, [pixels, paletteRgb, palette, width, height, loading, highlightCode]);

  useEffect(() => {
    const safeZoom = Number.isFinite(zoom) ? Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)) : 1;
    setScale(safeZoom);
    scaleRef.current = safeZoom;
  }, [zoom]);

  const clampPan = useCallback((nextPos) => {
    const stageWidth = resolvedContainerSize.width;
    const stageHeight = resolvedContainerSize.height;
    const gridWidth = width * BASE_PIXEL_SIZE * scaleRef.current;
    const gridHeight = height * BASE_PIXEL_SIZE * scaleRef.current;
    // 额外的留白空间，允许画布周围多留出一些空白区域
    const padding = Math.min(stageWidth, stageHeight) * 0.4;

    const clampAxis = (pos, stageSize, gridSize) => {
      if (!Number.isFinite(pos)) return 0;
      if (!Number.isFinite(stageSize) || !Number.isFinite(gridSize)) return pos;
      if (gridSize <= stageSize) {
        if (!hasUserPannedRef.current) {
          return (stageSize - gridSize) / 2;
        }
        // 允许画布向周围多拖出 padding 的距离
        const min = -padding;
        const max = stageSize - gridSize + padding;
        return Math.min(max, Math.max(min, pos));
      }
      // 画布大于视口时，也允许额外的留白空间
      const min = stageSize - gridSize - padding;
      const max = padding;
      return Math.min(max, Math.max(min, pos));
    };

    return {
      x: clampAxis(nextPos.x, stageWidth, gridWidth),
      y: clampAxis(nextPos.y, stageHeight, gridHeight),
    };
  }, [resolvedContainerSize.width, resolvedContainerSize.height, width, height]);

  useEffect(() => {
    const newX = Number.isFinite(panOffset?.x) ? panOffset.x : 0;
    const newY = Number.isFinite(panOffset?.y) ? panOffset.y : 0;
    if (!isPanning && !isWheelZoomingRef.current) {
      const nextPos = clampPan({ x: newX, y: newY });
      setLocalStagePosition(nextPos);
      panRef.current = nextPos;
    }
  }, [panOffset?.x, panOffset?.y, isPanning, clampPan]);

  useEffect(() => {
    panRef.current = localStagePosition;
  }, [localStagePosition]);

  useEffect(() => {
    return () => {
      if (wheelRafRef.current) cancelAnimationFrame(wheelRafRef.current);
      if (panRafRef.current) cancelAnimationFrame(panRafRef.current);
      if (wheelEndTimeoutRef.current) clearTimeout(wheelEndTimeoutRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId = null;
    let timeoutId = null;
    let pollRafId = null;

    const resolveSize = () => {
      let rect = container.getBoundingClientRect();
      let width = rect.width;
      let height = rect.height;

      if ((!width || !height) && container.parentElement) {
        rect = container.parentElement.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
      }

      if (!width || !height) {
        width = document.documentElement.clientWidth;
        height = document.documentElement.clientHeight;
      }

      return { width, height };
    };

    const updateSize = () => {
      const newSize = resolveSize();
      const lastSize = lastContainerSizeRef.current;

      if (newSize.width !== lastSize.width || newSize.height !== lastSize.height) {
        lastContainerSizeRef.current = newSize;
        setContainerSize(newSize);
        onContainerResizeRef.current?.(newSize);
      }
    };

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateSize) : null;
    if (observer) {
      observer.observe(container);
      if (container.parentElement) {
        observer.observe(container.parentElement);
      }
    }

    // Initial sync + a short poll window to survive "first paint = 0x0" layouts during route transitions.
    updateSize();
    rafId = requestAnimationFrame(updateSize);
    timeoutId = setTimeout(updateSize, 250);
    pollRafId = requestAnimationFrame(function poll() {
      updateSize();
      // Stop polling once we have a real size; ResizeObserver + resize listener will take over.
      const { width, height } = lastContainerSizeRef.current;
      if (width > 1 && height > 1) {
        pollRafId = null;
        return;
      }
      pollRafId = requestAnimationFrame(poll);
    });

    window.addEventListener('resize', updateSize);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateSize);
      if (rafId) cancelAnimationFrame(rafId);
      if (timeoutId) clearTimeout(timeoutId);
      if (pollRafId) cancelAnimationFrame(pollRafId);
    };
  }, []);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.size(resolvedContainerSize);
    const container = stage.container();
    if (container) {
      container.style.width = `${resolvedContainerSize.width}px`;
      container.style.height = `${resolvedContainerSize.height}px`;
    }
    stage.batchDraw();
  }, [resolvedContainerSize.width, resolvedContainerSize.height]);

  useEffect(() => {
    if (isPanning || isWheelZoomingRef.current) return;
    const clampedPos = clampPan(panRef.current);
    if (clampedPos.x === panRef.current.x && clampedPos.y === panRef.current.y) return;
    setLocalStagePosition(clampedPos);
    panRef.current = clampedPos;
    onPan?.(clampedPos);
  }, [resolvedContainerSize.width, resolvedContainerSize.height, scale, clampPan, isPanning, onPan]);

  const applyPanUpdate = useCallback((nextPos) => {
    const clampedPos = clampPan(nextPos);
    setLocalStagePosition(clampedPos);
    panRef.current = clampedPos;
    if (!onPan) return;
    pendingPanRef.current = clampedPos;
    if (panRafRef.current) return;
    panRafRef.current = requestAnimationFrame(() => {
      panRafRef.current = null;
      if (pendingPanRef.current) {
        onPan(pendingPanRef.current);
      }
    });
  }, [onPan, clampPan]);

  const handleStageMouseDown = useCallback((e) => {
    const stage = e.target.getStage();
    if (!stage) return;
    if (e.evt.button === 2) {
      e.evt.preventDefault();
    }

    const gridPos = () => {
      const pointer = stage.getPointerPosition();
      if (!pointer) return null;
      const x = Math.floor((pointer.x - stagePosition.x) / (BASE_PIXEL_SIZE * scale));
      const y = Math.floor((pointer.y - stagePosition.y) / (BASE_PIXEL_SIZE * scale));
      if (x >= 0 && x < width && y >= 0 && y < height) {
        return { x, y };
      }
      return null;
    };

    // 中键或 Alt+左键拖拽平移，在 readonly 模式下也允许
    if (e.evt.button === 1 || (e.evt.button === 0 && e.evt.altKey)) {
      hasUserPannedRef.current = true;
      setIsPanning(true);
      setLastPointerPos({ x: e.evt.clientX, y: e.evt.clientY });
      activeEraserRef.current = false;
      return;
    }

    // readonly 模式下，左键拖动平移画布
    if (readonly && e.evt.button === 0) {
      hasUserPannedRef.current = true;
      setIsPanning(true);
      setLastPointerPos({ x: e.evt.clientX, y: e.evt.clientY });
      activeEraserRef.current = false;
      return;
    }

    // 以下绘制操作在 readonly 模式下不执行
    if (readonly) return;

    if (e.evt.button === 0) {
      const pos = gridPos();
      if (pos && onPixelClick) {
        if (onDrawStart) onDrawStart();
        setIsDrawing(true);
        const isEraser = currentTool === 'eraser';
        activeEraserRef.current = isEraser;
        onPixelClick(pos.x, pos.y, isEraser);
        setLastPos(pos);
      }
    }

    if (e.evt.button === 2) {
      const pos = gridPos();
      if (pos && onPixelClick) {
        if (onDrawStart) onDrawStart();
        setIsDrawing(true);
        activeEraserRef.current = true;
        onPixelClick(pos.x, pos.y, true);
        setLastPos(pos);
      }
    }
  }, [readonly, onPixelClick, onDrawStart, stagePosition, scale, width, height, currentTool]);

  const handleStageMouseMove = useCallback((e) => {
    const stage = e.target.getStage();
    if (!stage) return;

    if (isPanning && lastPointerPos) {
      const dx = e.evt.clientX - lastPointerPos.x;
      const dy = e.evt.clientY - lastPointerPos.y;

      const newPos = {
        x: stagePosition.x + dx,
        y: stagePosition.y + dy,
      };

      applyPanUpdate(newPos);
      setLastPointerPos({ x: e.evt.clientX, y: e.evt.clientY });

      return;
    }

    if (isDrawing && !readonly && onPixelDrag) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const x = Math.floor((pointer.x - stagePosition.x) / (BASE_PIXEL_SIZE * scale));
      const y = Math.floor((pointer.y - stagePosition.y) / (BASE_PIXEL_SIZE * scale));

      if (x >= 0 && x < width && y >= 0 && y < height) {
        if (!lastPos || x !== lastPos.x || y !== lastPos.y) {
          onPixelDrag(x, y, activeEraserRef.current);
          setLastPos({ x, y });
        }
      }
    }
  }, [isPanning, isDrawing, readonly, onPixelDrag, lastPointerPos, stagePosition, lastPos, width, height, scale, applyPanUpdate]);

  const handleStageMouseUp = useCallback((e) => {
    if (e?.evt?.button === 2) {
      e.evt.preventDefault();
    }
    if (isPanning) {
      setIsPanning(false);
      setLastPointerPos(null);
    }
    if (isDrawing && onDrawEnd) {
      onDrawEnd();
    }
    setIsDrawing(false);
    activeEraserRef.current = false;
    setLastPos(null);
  }, [isPanning, isDrawing, onDrawEnd]);

  const handleTouchStart = useCallback((e) => {
    const stage = e.target.getStage();
    if (!stage) return;
    e.evt.preventDefault();

    const gridPos = () => {
      const pointer = stage.getPointerPosition();
      if (!pointer) return null;
      const x = Math.floor((pointer.x - stagePosition.x) / (BASE_PIXEL_SIZE * scale));
      const y = Math.floor((pointer.y - stagePosition.y) / (BASE_PIXEL_SIZE * scale));
      if (x >= 0 && x < width && y >= 0 && y < height) {
        return { x, y };
      }
      return null;
    };

    if (e.evt.touches.length === 2) {
      hasUserPannedRef.current = true;
      setIsPanning(true);
      setIsDrawing(false);
      activeEraserRef.current = false;
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];
      const center = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      setLastPointerPos(center);
      pinchRef.current = {
        center,
        distance: distance || 1,
        scale: scaleRef.current,
        pan: panRef.current,
      };
      return;
    }

    if (e.evt.touches.length === 1) {
      if (allowSingleFingerPan) {
        hasUserPannedRef.current = true;
        setIsPanning(true);
        setIsDrawing(false);
        activeEraserRef.current = false;
        const touch = e.evt.touches[0];
        setLastPointerPos({ x: touch.clientX, y: touch.clientY });
        return;
      }
      if (readonly) return;
      const pos = gridPos();
      if (pos && onPixelClick) {
        if (onDrawStart) onDrawStart();
        setIsDrawing(true);
        const isEraser = currentTool === 'eraser';
        activeEraserRef.current = isEraser;
        onPixelClick(pos.x, pos.y, isEraser);
        setLastPos(pos);
      }
    }
  }, [readonly, onPixelClick, onDrawStart, stagePosition, scale, width, height, currentTool, allowSingleFingerPan]);

  const handleTouchMove = useCallback((e) => {
    const stage = e.target.getStage();
    if (!stage) return;
    e.evt.preventDefault();

    if (isPanning && e.evt.touches.length === 2) {
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY) || 1;
      const prevPinch = pinchRef.current;
      if (prevPinch) {
        const scaleRatio = distance / prevPinch.distance;
        const nextScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prevPinch.scale * scaleRatio));
        const ratio = nextScale / prevPinch.scale;
        const anchorPan = {
          x: prevPinch.center.x - (prevPinch.center.x - prevPinch.pan.x) * ratio,
          y: prevPinch.center.y - (prevPinch.center.y - prevPinch.pan.y) * ratio,
        };
        const newPos = {
          x: anchorPan.x + (centerX - prevPinch.center.x),
          y: anchorPan.y + (centerY - prevPinch.center.y),
        };

        scaleRef.current = nextScale;
        setScale(nextScale);
        applyPanUpdate(newPos);
        onZoom?.(nextScale);

        pinchRef.current = {
          center: { x: centerX, y: centerY },
          distance,
          scale: nextScale,
          pan: newPos,
        };
      } else if (lastPointerPos) {
        const dx = centerX - lastPointerPos.x;
        const dy = centerY - lastPointerPos.y;
        const newPos = {
          x: stagePosition.x + dx,
          y: stagePosition.y + dy,
        };
        applyPanUpdate(newPos);
        setLastPointerPos({ x: centerX, y: centerY });
      }

      return;
    }

    if (allowSingleFingerPan && isPanning && lastPointerPos && e.evt.touches.length === 1) {
      const touch = e.evt.touches[0];
      const dx = touch.clientX - lastPointerPos.x;
      const dy = touch.clientY - lastPointerPos.y;
      const newPos = {
        x: stagePosition.x + dx,
        y: stagePosition.y + dy,
      };
      applyPanUpdate(newPos);
      setLastPointerPos({ x: touch.clientX, y: touch.clientY });
      return;
    }

    if (isDrawing && e.evt.touches.length === 1 && !readonly && onPixelDrag) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const x = Math.floor((pointer.x - stagePosition.x) / (BASE_PIXEL_SIZE * scale));
      const y = Math.floor((pointer.y - stagePosition.y) / (BASE_PIXEL_SIZE * scale));

      if (x >= 0 && x < width && y >= 0 && y < height) {
        if (!lastPos || x !== lastPos.x || y !== lastPos.y) {
          onPixelDrag(x, y, activeEraserRef.current);
          setLastPos({ x, y });
        }
      }
    }
  }, [isPanning, isDrawing, readonly, onPixelDrag, lastPointerPos, stagePosition, lastPos, width, height, scale, applyPanUpdate, allowSingleFingerPan, onZoom]);

  const handleTouchEnd = useCallback((e) => {
    const remainingTouches = e?.evt?.touches?.length ?? 0;
    if (remainingTouches < 2) {
      pinchRef.current = null;
    }
    if (remainingTouches === 1) {
      if (allowSingleFingerPan) {
        const touch = e.evt.touches[0];
        setIsPanning(true);
        setLastPointerPos({ x: touch.clientX, y: touch.clientY });
      } else {
        setIsPanning(false);
        setLastPointerPos(null);
      }
    } else if (remainingTouches === 0) {
      setIsPanning(false);
      setLastPointerPos(null);
    }
    if (isDrawing && onDrawEnd) {
      onDrawEnd();
    }
    setIsDrawing(false);
    activeEraserRef.current = false;
    setLastPos(null);
  }, [isDrawing, onDrawEnd, allowSingleFingerPan]);

  const handleWheel = useCallback((e) => {
    e.evt.preventDefault();

    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const delta = e.evt.deltaY > 0 ? -1 : 1;
    pendingWheelRef.current.delta += delta;
    pendingWheelRef.current.pointer = pointer;
    isWheelZoomingRef.current = true;

    if (wheelEndTimeoutRef.current) clearTimeout(wheelEndTimeoutRef.current);
    wheelEndTimeoutRef.current = setTimeout(() => {
      isWheelZoomingRef.current = false;
    }, 120);

    if (wheelRafRef.current) return;
    wheelRafRef.current = requestAnimationFrame(() => {
      wheelRafRef.current = null;
      const { delta: pendingDelta, pointer: pendingPointer } = pendingWheelRef.current;
      pendingWheelRef.current.delta = 0;
      if (!pendingPointer) return;

      const nextScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scaleRef.current + pendingDelta * 0.1));
      if (nextScale === scaleRef.current) return;

      const scaleRatio = nextScale / scaleRef.current;
      const currentPos = panRef.current;
      const newPos = {
        x: pendingPointer.x - (pendingPointer.x - currentPos.x) * scaleRatio,
        y: pendingPointer.y - (pendingPointer.y - currentPos.y) * scaleRatio,
      };

      scaleRef.current = nextScale;
      setScale(nextScale);
      applyPanUpdate(newPos);
      onZoom?.(nextScale);
    });
  }, [applyPanUpdate, onZoom]);

  if (loading) {
    return (
      <div className="pixel-grid-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="pixel-grid-container"
      onContextMenu={(e) => e.preventDefault()}
      style={{
        // If ancestors temporarily report 0x0 (common during initial route/layout),
        // we used to fall back to explicit pixel size, but locking width/height prevents
        // ResizeObserver from detecting container expansion. So we must use 100% here
        // and let the parent container control the size.
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 'auto',
        bottom: 'auto',
        overflow: 'hidden',
        cursor: isPanning ? 'grabbing' : (readonly ? 'grab' : 'crosshair'),
        background: 'var(--color-bg)',
        touchAction: 'none',
      }}
    >
      <style>{`
        .pixel-grid-container .konvajs-content canvas {
          image-rendering: pixelated;
          image-rendering: crisp-edges;
          filter: none;
        }
      `}</style>
      <Stage
        ref={stageRef}
        key={`${resolvedContainerSize.width}x${resolvedContainerSize.height}`}
        width={resolvedContainerSize.width}
        height={resolvedContainerSize.height}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onMouseLeave={handleStageMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onContextMenu={(e) => e.evt.preventDefault()}
      >
        {/* Pan in screen pixels on the Layer; zoom on the Group so pan doesn't get scaled. */}
        <Layer x={stagePosition.x} y={stagePosition.y} imageSmoothingEnabled={false}>
          <Group scaleX={scale} scaleY={scale}>
            <Rect
              x={0}
              y={0}
              width={width * BASE_PIXEL_SIZE}
              height={height * BASE_PIXEL_SIZE}
              fill={EMPTY_COLOR}
            />
            <Image
              ref={imageRef}
              image={pixelImage}
              x={0}
              y={0}
              width={width}
              height={height}
              scaleX={BASE_PIXEL_SIZE}
              scaleY={BASE_PIXEL_SIZE}
              imageSmoothingEnabled={false}
              listening={false}
            />
          </Group>
        </Layer>
        {showCodes && codeLabels.length > 0 && (
          <Layer x={stagePosition.x} y={stagePosition.y} listening={false} imageSmoothingEnabled={false}>
            <Group scaleX={scale} scaleY={scale}>
              {codeLabels.map((label) => (
                <Text
                  key={label.key}
                  x={label.x}
                  y={label.y}
                  width={BASE_PIXEL_SIZE}
                  height={BASE_PIXEL_SIZE}
                  text={label.text}
                  fontSize={7}
                  fontFamily="Menlo, Monaco, Consolas, 'Liberation Mono', monospace"
                  fill={label.fill}
                  align="center"
                  verticalAlign="middle"
                  listening={false}
                />
              ))}
            </Group>
          </Layer>
        )}
        {showGrid && scale >= 0.25 && (
          <Layer x={stagePosition.x} y={stagePosition.y} listening={false} imageSmoothingEnabled={false}>
            <Group scaleX={scale} scaleY={scale}>
              {Array.from({ length: width + 1 }).map((_, x) => {
                const isMajorLine = x === 0 || x % 10 === 0;
                const isMidLine = x % 5 === 0;
                const stroke = isMajorLine ? 'rgba(0, 0, 0, 0.25)' : (isMidLine ? 'rgba(0, 0, 0, 0.12)' : GRID_LINE_COLOR);
                const strokeWidth = isMajorLine ? 2 : 1;
                const dash = isMidLine && !isMajorLine ? [4, 4] : undefined;
                return (
                  <Line
                    key={`v-${x}`}
                    points={[x * BASE_PIXEL_SIZE, 0, x * BASE_PIXEL_SIZE, height * BASE_PIXEL_SIZE]}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    dash={dash}
                  />
                );
              })}
              {Array.from({ length: height + 1 }).map((_, y) => {
                const isMajorLine = y === 0 || y % 10 === 0;
                const isMidLine = y % 5 === 0;
                const stroke = isMajorLine ? 'rgba(0, 0, 0, 0.25)' : (isMidLine ? 'rgba(0, 0, 0, 0.12)' : GRID_LINE_COLOR);
                const strokeWidth = isMajorLine ? 2 : 1;
                const dash = isMidLine && !isMajorLine ? [4, 4] : undefined;
                return (
                  <Line
                    key={`h-${y}`}
                    points={[0, y * BASE_PIXEL_SIZE, width * BASE_PIXEL_SIZE, y * BASE_PIXEL_SIZE]}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    dash={dash}
                  />
                );
              })}
            </Group>
          </Layer>
        )}
      </Stage>
    </div>
  );
}

export default PixelGrid;
