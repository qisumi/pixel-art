import { Router } from 'express';
import * as patternService from '../services/patternService.js';
import { z } from 'zod';

const router = Router();

const createPatternSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(''),
  width: z.number().int().min(1).max(128),
  height: z.number().int().min(1).max(128),
  palette: z.array(z.string().nullable()).min(1),
  data: z.string().min(1),
  tags: z.array(z.string().min(1).max(30)).optional().default([]),
});

const updatePatternSchema = createPatternSchema.partial();

const listQuerySchema = z.object({
  keyword: z.string().optional(),
  tag: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: z.enum(['created_at', 'updated_at', 'name']).optional().default('updated_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

router.get('/', (req, res) => {
  const parseResult = listQuerySchema.safeParse(req.query);
  
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parseResult.error.errors[0].message,
      },
    });
  }

  const result = patternService.listPatterns(parseResult.data);
  res.json({ success: true, data: result });
});

router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid pattern ID' },
    });
  }

  const pattern = patternService.getPattern(id);
  if (!pattern) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Pattern not found' },
    });
  }

  res.json({ success: true, data: pattern });
});

router.post('/', (req, res) => {
  const parseResult = createPatternSchema.safeParse(req.body);
  
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parseResult.error.errors[0].message,
        details: parseResult.error.errors,
      },
    });
  }

  try {
    const pattern = patternService.createPattern(parseResult.data);
    res.status(201).json({ success: true, data: pattern });
  } catch (err) {
    if (err.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: err.message },
      });
    }
    throw err;
  }
});

router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid pattern ID' },
    });
  }

  const parseResult = updatePatternSchema.safeParse(req.body);
  
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
    const pattern = patternService.updatePattern(id, parseResult.data);
    if (!pattern) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Pattern not found' },
      });
    }
    res.json({ success: true, data: pattern });
  } catch (err) {
    if (err.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: err.message },
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
      error: { code: 'VALIDATION_ERROR', message: 'Invalid pattern ID' },
    });
  }

  const deleted = patternService.deletePattern(id);
  if (!deleted) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Pattern not found' },
    });
  }

  res.status(204).send();
});

export default router;
