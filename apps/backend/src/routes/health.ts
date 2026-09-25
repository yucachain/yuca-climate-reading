import { Router, Request, Response } from 'express';
import { isPostgresConnected, db } from '../db/db.js';

const router = Router();

// GET /api/health - Backend and DB Health status
router.get('/', async (_req: Request, res: Response) => {
  try {
    const units = await db.getUnits();
    const settings = await db.getSettings();

    res.json({
      status: 'healthy',
      service: 'YucaVault IoT Backend',
      version: '1.0.0',
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        engine: 'PostgreSQL',
        connected: isPostgresConnected,
        mode: isPostgresConnected ? 'Production PostgreSQL' : 'Resilience Cache Store',
      },
      fleet: {
        totalUnits: units.length,
        units: units.map((u) => ({ id: u.id, name: u.name, code: u.code, ip: u.esp32Ip })),
      },
      settings,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

export default router;
