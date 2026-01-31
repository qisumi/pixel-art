# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A pixel art editor for perler/fuse beads with pattern management, color matching, and mobile preview. Built with React (Vite) frontend and Node.js/Express/SQLite backend.

## Commands

### Development
- `npm run dev` - Start both backend (port 4571) and frontend (port 5173) with hot reload
- `npm run dev:server` - Start backend only
- `npm run dev:client` - Start frontend only (in `client/` directory)
- `npm run build` - Build frontend for production (outputs to `client/dist`)

### Database
- `npm run db:init` - Initialize SQLite database (creates `data/pixelart.db` by default)

### Production
- `npm start` - Start backend server (serves frontend static files in production mode)
- `pm2 start ecosystem.config.cjs --env production` - Deploy with PM2

## Architecture

### Monorepo Structure
- Root package.json orchestrates both frontend and backend
- `client/` - React + Vite frontend
- `server/` - Express API server
- `assets/colors.txt` - MARD color definitions (221 colors)

### Core Data Model

**Palette Structure**: `[null, 'H1', 'A5', ...]`
- Index 0 is always `null` (transparent/eraser)
- All other indices are MARD color codes (e.g., 'H1', 'A5')

**RLE Compression**: Pixel data is stored/transmitted as Run-Length Encoded strings
- Format: `"count*index,count*index,..."` (e.g., `"3*0,2*1,1*0"` → `[0,0,0,1,1,0]`)
- Implemented in both `client/src/utils/rle.js` and `server/utils/rle.js`
- Critical: `pixels.length` must equal `width * height` before encoding

### State Management

Zustand store (`client/src/stores/editorStore.js`) manages:
- Pattern metadata (name, description, tags, dimensions)
- Palette and pixel data
- Editor state (current tool, color, zoom, pan, history)
- Implements undo/redo (max 50 states)

### API Layer

Unified response format:
- Success: `{ success: true, data: {...} }`
- Error: `{ success: false, error: { code, message, details } }`

Frontend API wrapper (`client/src/utils/api.js`) automatically unpacks responses or throws errors.

### Color System

MARD 221-color palette with HEX matching:
- Colors loaded from `assets/colors.txt` (`server/utils/colorMatch.js`)
- HEX to MARD matching uses CIEDE2000 algorithm for perceptual accuracy
- API: `GET /api/colors/match?hex=ff0000` (no `#`, 6 digits)

### Key Components

**PixelGrid** (`client/src/components/PixelGrid/`) - Canvas-based editor
- Uses Konva/React-Konva for rendering
- Supports brush, eraser, fill tools with zoom/pan
- ImageData-based rendering for performance

**PatternEditPage** - Main editor interface with keyboard shortcuts (B/E/F, Ctrl+Z/Y)

**PatternViewPage** - Read-only mobile preview

## Important Constraints

- Max canvas size: 128x128 pixels
- Palette indices must be `< palette.length`
- SQLite single-instance recommended for production (see `ecosystem.config.cjs`)
- Use Zod for validation on API routes
- Backend uses ESM modules (`"type": "module"`)

## Environment Variables

```
PORT=4571                    # Backend port
DATABASE_PATH=./data/pixelart.db  # SQLite file location
LOG_LEVEL=info               # pino log level
NODE_ENV=development         # Enables pino-pretty in dev
```

## Common Gotchas

1. **RLE Length Mismatch**: Ensure pixel arrays match expected dimensions before encoding
2. **Palette Index Out of Bounds**: Indices reference into palette array, not color codes
3. **Legacy Data**: Old patterns may not have `null` at palette[0]; store normalizes this
4. **Container Size 0 on Mount**: `editorStore.containerSize` may be transiently 0 during mount; `fitToScreen()` and `centerCanvas()` ignore sizes <= 1
