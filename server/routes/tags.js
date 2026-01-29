import { Router } from 'express';
import * as tagService from '../services/tagService.js';
import { z } from 'zod';

const router = Router();

const createTagSchema = z.object({
  name: z.string().min(1).max(30),
});

router.get('/', (req, res) => {
  const tags = tagService.getAllTags();
  res.json({ success: true, data: tags });
});

router.post('/', (req, res) => {
  const parseResult = createTagSchema.safeParse(req.body);
  
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parseResult.error.errors[0].message,
      },
    });
  }

  try {
    const tag = tagService.createTag(parseResult.data.name);
    res.status(201).json({ success: true, data: tag });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Tag already exists' },
      });
    }
    throw err;
  }
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid tag ID' },
    });
  }

  const deleted = tagService.deleteTag(id);
  if (!deleted) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Tag not found' },
    });
  }

  res.status(204).send();
});

export default router;
