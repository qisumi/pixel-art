import db from '../db/init.js';
import * as tagService from './tagService.js';
import { isValidColorCode } from '../utils/colorMatch.js';
import { validate as validateRle } from '../utils/rle.js';

function validatePalette(palette) {
  for (let i = 0; i < palette.length; i += 1) {
    const code = palette[i];
    if (i === 0 && (code === null || code === undefined || code === '')) {
      continue;
    }
    if (!isValidColorCode(code)) {
      throw new Error(`Invalid palette: color '${code}' not found in MARD colors`);
    }
  }
}

function validatePatternData(data, width, height, paletteLength) {
  const expectedLength = width * height;
  const maxIndex = paletteLength - 1;
  const result = validateRle(data, expectedLength, maxIndex);
  
  if (!result.valid) {
    throw new Error(`Invalid RLE data: ${result.error}`);
  }
}

function getPatternTags(patternId) {
  const stmt = db.prepare(`
    SELECT t.name FROM tags t
    JOIN pattern_tags pt ON t.id = pt.tag_id
    WHERE pt.pattern_id = ?
  `);
  return stmt.all(patternId).map(t => t.name);
}

function setPatternTags(patternId, tagNames) {
  db.prepare('DELETE FROM pattern_tags WHERE pattern_id = ?').run(patternId);
  
  if (tagNames && tagNames.length > 0) {
    const insertStmt = db.prepare('INSERT OR IGNORE INTO pattern_tags (pattern_id, tag_id) VALUES (?, ?)');
    
    for (const name of tagNames) {
      const tag = tagService.getOrCreateTag(name);
      insertStmt.run(patternId, tag.id);
    }
  }
}

export function listPatterns({ keyword, tag, page, pageSize, sort, order }) {
  let whereClause = '1=1';
  const params = [];

  if (keyword) {
    whereClause += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    const likePattern = `%${keyword}%`;
    params.push(likePattern, likePattern);
  }

  if (tag) {
    whereClause += ` AND p.id IN (
      SELECT pt.pattern_id FROM pattern_tags pt
      JOIN tags t ON t.id = pt.tag_id
      WHERE t.name = ?
    )`;
    params.push(tag);
  }

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM patterns p WHERE ${whereClause}`);
  const { total } = countStmt.get(...params);

  const totalPages = Math.ceil(total / pageSize);
  const offset = (page - 1) * pageSize;

  const listStmt = db.prepare(`
    SELECT p.id, p.name, p.description, p.width, p.height, p.palette, p.data, p.created_at, p.updated_at
    FROM patterns p
    WHERE ${whereClause}
    ORDER BY p.${sort} ${order.toUpperCase()}
    LIMIT ? OFFSET ?
  `);

  const items = listStmt.all(...params, pageSize, offset).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    width: p.width,
    height: p.height,
    palette: JSON.parse(p.palette),
    data: p.data,
    tags: getPatternTags(p.id),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));

  return {
    items,
    pagination: { page, pageSize, total, totalPages },
  };
}

export function getPattern(id) {
  const stmt = db.prepare('SELECT * FROM patterns WHERE id = ?');
  const pattern = stmt.get(id);

  if (!pattern) return null;

  return {
    id: pattern.id,
    name: pattern.name,
    description: pattern.description ?? '',
    width: pattern.width,
    height: pattern.height,
    palette: JSON.parse(pattern.palette),
    data: pattern.data,
    tags: getPatternTags(pattern.id),
    createdAt: pattern.created_at,
    updatedAt: pattern.updated_at,
  };
}

export function createPattern({ name, description, width, height, palette, data, tags }) {
  validatePalette(palette);
  validatePatternData(data, width, height, palette.length);

  const stmt = db.prepare(`
    INSERT INTO patterns (name, description, width, height, palette, data)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(name, description, width, height, JSON.stringify(palette), data);
  const patternId = result.lastInsertRowid;

  setPatternTags(patternId, tags);

  return getPattern(patternId);
}

export function updatePattern(id, updates) {
  const existing = db.prepare('SELECT * FROM patterns WHERE id = ?').get(id);
  if (!existing) return null;

  const current = {
    name: existing.name,
    description: existing.description,
    width: existing.width,
    height: existing.height,
    palette: JSON.parse(existing.palette),
    data: existing.data,
  };

  const merged = { ...current, ...updates };

  if (updates.palette) validatePalette(merged.palette);
  if (updates.data || updates.width || updates.height || updates.palette) {
    validatePatternData(merged.data, merged.width, merged.height, merged.palette.length);
  }

  const stmt = db.prepare(`
    UPDATE patterns
    SET name = ?, description = ?, width = ?, height = ?, palette = ?, data = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  stmt.run(
    merged.name,
    merged.description,
    merged.width,
    merged.height,
    JSON.stringify(merged.palette),
    merged.data,
    id
  );

  if (updates.tags !== undefined) {
    setPatternTags(id, updates.tags);
  }

  return getPattern(id);
}

export function deletePattern(id) {
  const result = db.prepare('DELETE FROM patterns WHERE id = ?').run(id);
  return result.changes > 0;
}
