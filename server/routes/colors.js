import { Router } from 'express';
import { getAllColors, matchColor, isValidColorCode } from '../utils/colorMatch.js';
import { z } from 'zod';

const router = Router();

const hexQuerySchema = z.object({
  hex: z.string().regex(/^[0-9a-fA-F]{6}$/, 'Must be 6-digit hex without #'),
});

router.get('/', (req, res) => {
  const colors = getAllColors();
  res.json({ success: true, data: colors });
});

router.get('/match', (req, res) => {
  const parseResult = hexQuerySchema.safeParse(req.query);
  
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parseResult.error.errors[0].message,
      },
    });
  }

  const result = matchColor(parseResult.data.hex);
  res.json({ success: true, data: result });
});

router.get('/validate/:code', (req, res) => {
  const valid = isValidColorCode(req.params.code);
  res.json({ success: true, data: { code: req.params.code, valid } });
});

export default router;
