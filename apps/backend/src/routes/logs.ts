import { Router, Request, Response } from 'express';
import { db } from '../db/db.js';

const router = Router();

// GET /api/logs - List diagnostic activity and alert logs
router.get('/', async (req: Request, res: Response) => {
  try {
    const unitId = req.query.unitId as string | undefined;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const logs = await db.getLogs(unitId, limit);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch logs' });
  }
});

// POST /api/logs - Create manual log entry
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { unitId, type, message, severity } = req.body;
    if (!message) {
      res.status(400).json({ error: 'Log message is required' });
      return;
    }

    const log = await db.addLog(
      unitId || 'global',
      type || 'system',
      String(message),
      severity || 'info'
    );
    res.status(201).json(log);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to record log' });
  }
});

// DELETE /api/logs - Clear logs
router.delete('/', async (_req: Request, res: Response) => {
  try {
    await db.clearLogs();
    res.json({ success: true, message: 'Logs cleared' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to clear logs' });
  }
});

export default router;
