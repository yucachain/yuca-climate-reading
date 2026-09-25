import { Router, Request, Response } from 'express';
import { db } from '../db/db.js';
import { iotGateway } from '../services/gateway.js';

const router = Router();

// POST /api/telemetry/ingest - Direct Push from ESP32
router.post('/ingest', async (req: Request, res: Response): Promise<void> => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress;
    const result = await iotGateway.handleTelemetryIngest(req.body, clientIp);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Ingestion failed' });
  }
});

// GET /api/telemetry/status - Get latest status for all active units
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const units = await db.getUnits();
    const statusMap: Record<string, any> = {};

    await Promise.all(
      units.map(async (u) => {
        const st = await db.getLatestStatus(u.id);
        if (st) {
          statusMap[u.id] = st;
        }
      })
    );

    res.json(statusMap);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch telemetry status' });
  }
});

// GET /api/telemetry/proxy - Proxy a GET request to an ESP32 at ?ip=...
router.get('/proxy', async (req: Request, res: Response): Promise<void> => {
  const espIp = req.query.ip as string;
  if (!espIp) {
    res.status(400).json({ error: 'Missing ESP32 IP parameter (?ip=...)' });
    return;
  }

  const result = await iotGateway.pingEsp32(espIp);
  if (!result.success) {
    res.status(504).json({ error: result.error || 'Failed to reach ESP32' });
    return;
  }

  res.json(result.data);
});

export default router;
