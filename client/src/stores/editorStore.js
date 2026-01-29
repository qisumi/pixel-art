import { create } from 'zustand';
import { encode, decode } from '../utils/rle.js';

const DEFAULT_WIDTH = 52;
const DEFAULT_HEIGHT = 52;
const EMPTY_PALETTE_ENTRY = null;
const DEFAULT_PALETTE = [EMPTY_PALETTE_ENTRY, 'H1'];

function createEmptyPixels(width, height) {
  return new Array(width * height).fill(0);
}

function floodFill(pixels, width, height, x, y, targetIndex, fillIndex) {
  if (targetIndex === fillIndex) return pixels;
  
  const newPixels = [...pixels];
  const stack = [[x, y]];
  
  while (stack.length > 0) {
    const [cx, cy] = stack.pop();
    const idx = cy * width + cx;
    
    if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
    if (newPixels[idx] !== targetIndex) continue;
    
    newPixels[idx] = fillIndex;
    
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  
  return newPixels;
}

export const useEditorStore = create((set, get) => ({
  patternId: null,
  name: '',
  description: '',
  tags: [],
  
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  palette: [...DEFAULT_PALETTE],
  pixels: createEmptyPixels(DEFAULT_WIDTH, DEFAULT_HEIGHT),
  
  currentTool: 'brush',
  currentColorIndex: 1,
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  showGrid: true,
  
  history: [],
  historyIndex: -1,
  
  isDirty: false,
  isDrawing: false,

  initNew: (width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT) => {
    set({
      patternId: null,
      name: '',
      description: '',
      tags: [],
      width,
      height,
      palette: [...DEFAULT_PALETTE],
      pixels: createEmptyPixels(width, height),
      currentTool: 'brush',
      currentColorIndex: 1,
      zoom: 1,
      panOffset: { x: 0, y: 0 },
      showGrid: true,
      history: [],
      historyIndex: -1,
      isDirty: false,
      isDrawing: false,
    });
  },

  loadPattern: (pattern) => {
    const rawPalette = Array.isArray(pattern.palette) ? pattern.palette : [];
    const hasEmptySlot = rawPalette[0] === EMPTY_PALETTE_ENTRY;
    const palette = hasEmptySlot ? rawPalette : [EMPTY_PALETTE_ENTRY, ...rawPalette];
    const decoded = decode(pattern.data, pattern.width * pattern.height);
    const pixels = hasEmptySlot
      ? decoded
      : decoded.map((index) => (index === 0 ? 0 : index + 1));
    set({
      patternId: pattern.id,
      name: pattern.name,
      description: pattern.description,
      tags: pattern.tags || [],
      width: pattern.width,
      height: pattern.height,
      palette,
      pixels,
      currentColorIndex: palette.length > 1 ? 1 : 0,
      zoom: 1,
      panOffset: { x: 0, y: 0 },
      history: [],
      historyIndex: -1,
      isDirty: false,
      isDrawing: false,
    });
  },

  getPatternData: () => {
    const state = get();
    return {
      name: state.name,
      description: state.description,
      width: state.width,
      height: state.height,
      palette: state.palette,
      data: encode(state.pixels),
      tags: state.tags,
    };
  },

  pushHistory: () => {
    const { pixels, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...pixels]);
    
    if (newHistory.length > 50) newHistory.shift();
    
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  setPixel: (x, y, toolOverride) => {
    const { width, height, pixels, currentColorIndex, currentTool, isDrawing } = get();
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    
    const idx = y * width + x;
    const activeTool = toolOverride || currentTool;
    const colorIndex = activeTool === 'eraser' ? 0 : currentColorIndex;
    
    if (pixels[idx] === colorIndex) return;
    
    if (!isDrawing) {
      get().pushHistory();
    }
    
    const newPixels = [...pixels];
    newPixels[idx] = colorIndex;
    
    set({ pixels: newPixels, isDirty: true });
  },

  startDrawing: () => {
    const { pixels } = get();
    get().pushHistory();
    set({ isDrawing: true });
  },

  endDrawing: () => {
    set({ isDrawing: false });
  },

  fill: (x, y) => {
    const { width, height, pixels, currentColorIndex } = get();
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    
    const idx = y * width + x;
    const targetIndex = pixels[idx];
    
    if (targetIndex === currentColorIndex) return;
    
    get().pushHistory();
    
    const newPixels = floodFill(pixels, width, height, x, y, targetIndex, currentColorIndex);
    set({ pixels: newPixels, isDirty: true });
  },

  undo: () => {
    const { history, historyIndex, pixels } = get();
    if (historyIndex < 0) return;
    
    if (historyIndex === history.length - 1) {
      const newHistory = [...history];
      newHistory.push([...pixels]);
      set({ history: newHistory });
    }
    
    set({
      pixels: [...history[historyIndex]],
      historyIndex: historyIndex - 1,
      isDirty: true,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 2) return;
    
    set({
      pixels: [...history[historyIndex + 2]],
      historyIndex: historyIndex + 1,
      isDirty: true,
    });
  },

  setTool: (tool) => set({ currentTool: tool }),
  
  setCurrentColor: (index) => set({ currentColorIndex: index, currentTool: 'brush' }),
  
  addColorToPalette: (mardCode) => {
    const { palette } = get();
    const existingIndex = palette.indexOf(mardCode);
    if (existingIndex !== -1) {
      set({ currentColorIndex: existingIndex });
      return existingIndex;
    }
    
    const newPalette = [...palette, mardCode];
    const newIndex = newPalette.length - 1;
    set({ palette: newPalette, currentColorIndex: newIndex, isDirty: true });
    return newIndex;
  },

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(8, zoom)) }),
  
  setPan: (offset) => set({ panOffset: offset }),
  
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

  containerSize: { width: 0, height: 0 },
  
  setContainerSize: (size) => set((state) => {
    const width = Number.isFinite(size?.width) ? size.width : 0;
    const height = Number.isFinite(size?.height) ? size.height : 0;
    // Ignore transient 0/1 sizes (common during initial mount/layout or route transitions)
    // so fit/center don't start working with bogus dimensions.
    if (width <= 1 || height <= 1) return {};
    return { containerSize: { width, height } };
  }),

  centerCanvas: () => {
    const { width, height, zoom } = get();
    const containerSize = (() => {
      const cs = get().containerSize;
      if (cs?.width > 1 && cs?.height > 1) return cs;
      if (typeof window !== 'undefined') return { width: window.innerWidth, height: window.innerHeight };
      return { width: 0, height: 0 };
    })();
    const BASE_PIXEL_SIZE = 16;
    const gridWidth = width * BASE_PIXEL_SIZE * zoom;
    const gridHeight = height * BASE_PIXEL_SIZE * zoom;
    const panX = (containerSize.width - gridWidth) / 2;
    const panY = (containerSize.height - gridHeight) / 2;
    set({ panOffset: { x: panX, y: panY } });
  },

  fitToScreen: () => {
    const { width, height } = get();
    const containerSize = (() => {
      const cs = get().containerSize;
      if (cs?.width > 1 && cs?.height > 1) return cs;
      if (typeof window !== 'undefined') return { width: window.innerWidth, height: window.innerHeight };
      return { width: 0, height: 0 };
    })();
    const BASE_PIXEL_SIZE = 16;
    const padding = 40;
    const availableWidth = containerSize.width - padding * 2;
    const availableHeight = containerSize.height - padding * 2;
    const gridWidth = width * BASE_PIXEL_SIZE;
    const gridHeight = height * BASE_PIXEL_SIZE;
    const scaleX = availableWidth / gridWidth;
    const scaleY = availableHeight / gridHeight;
    const newZoom = Math.min(scaleX, scaleY, 4);
    const clampedZoom = Math.max(0.1, Math.min(8, newZoom));
    
    const finalGridWidth = width * BASE_PIXEL_SIZE * clampedZoom;
    const finalGridHeight = height * BASE_PIXEL_SIZE * clampedZoom;
    const panX = (containerSize.width - finalGridWidth) / 2;
    const panY = (containerSize.height - finalGridHeight) / 2;
    
    set({ zoom: clampedZoom, panOffset: { x: panX, y: panY } });
  },

  setName: (name) => set({ name, isDirty: true }),
  
  setDescription: (description) => set({ description, isDirty: true }),
  
  setTags: (tags) => set({ tags, isDirty: true }),

  markClean: () => set({ isDirty: false }),
}));

export default useEditorStore;
