import db from '../db/init.js';

export function getAllTags() {
  const stmt = db.prepare(`
    SELECT t.id, t.name, COUNT(pt.pattern_id) as count
    FROM tags t
    LEFT JOIN pattern_tags pt ON t.id = pt.tag_id
    GROUP BY t.id
    ORDER BY t.name
  `);
  return stmt.all();
}

export function getTagByName(name) {
  return db.prepare('SELECT * FROM tags WHERE name = ?').get(name);
}

export function createTag(name) {
  const stmt = db.prepare('INSERT INTO tags (name) VALUES (?)');
  const result = stmt.run(name);
  return { id: result.lastInsertRowid, name };
}

export function getOrCreateTag(name) {
  let tag = getTagByName(name);
  if (!tag) {
    tag = createTag(name);
  }
  return tag;
}

export function deleteTag(id) {
  const result = db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  return result.changes > 0;
}
