import { Router, Request, Response } from 'express';
import { db } from '../db/db.js';
import { iotGateway } from '../services/gateway.js';

const router = Router();

// GET /api/settings - Get system telemetry polling settings
router.get('/', async (_req: Request, res: Response) => {
  try {
    const settings = await db.getSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch settings' });
  }
});

// PUT /api/settings - Update polling interval or enable/disable polling
router.put('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { pollInterval, pollingEnabled } = req.body;
    const current = await db.getSettings();

    const newInterval = pollInterval !== undefined ? Math.max(1000, Number(pollInterval)) : current.pollInterval;
    const newEnabled = pollingEnabled !== undefined ? Boolean(pollingEnabled) : current.pollingEnabled;

    await iotGateway.updateInterval(newInterval, newEnabled);
    const updated = await db.getSettings();

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update settings' });
  }
});

export default router;
