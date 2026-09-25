import { Router, Request, Response } from 'express';
import { db } from '../db/db.js';
import { iotGateway } from '../services/gateway.js';
import { ColdChainUnit } from '../types.js';

const router = Router();

// GET /api/units - List all active units with their latest status
router.get('/', async (_req: Request, res: Response) => {
  try {
    const units = await db.getUnits();
    const unitsWithStatus = await Promise.all(
      units.map(async (u) => {
        const latest = await db.getLatestStatus(u.id);
        return {
          ...u,
          status: latest,
        };
      })
    );
    res.json(unitsWithStatus);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch units' });
  }
});

// GET /api/units/:id - Get a specific unit
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const unitId = String(req.params.id);
    const unit = await db.getUnitById(unitId);
    if (!unit) {
      res.status(404).json({ error: 'Unit not found' });
      return;
    }
    const status = await db.getLatestStatus(unit.id);
    res.json({ ...unit, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch unit' });
  }
});

// POST /api/units - Create a new unit
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, code, type, locationDescription, esp32Ip } = req.body;
    if (!name || !code) {
      res.status(400).json({ error: 'Unit name and code are required' });
      return;
    }

    const newUnit: ColdChainUnit = {
      id: req.body.id || `unit-${Date.now()}`,
      name: String(name).trim(),
      code: String(code).trim().toUpperCase(),
      type: type === 'stationary' ? 'stationary' : 'transport',
      locationDescription: String(locationDescription || 'Cassava Storage Unit').trim(),
      esp32Ip: String(esp32Ip || '192.168.1.150').trim(),
      isActive: true,
    };

    const saved = await db.saveUnit(newUnit);
    await db.addLog(
      saved.id,
      'system',
      `Registered new unit: ${saved.name} (${saved.code}) at ${saved.esp32Ip}`,
      'success'
    );
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create unit' });
  }
});

// PUT /api/units/:id - Update unit details / ESP32 IP
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const unitId = String(req.params.id);
    const existing = await db.getUnitById(unitId);
    if (!existing) {
      res.status(404).json({ error: 'Unit not found' });
      return;
    }

    const updated: ColdChainUnit = {
      ...existing,
      name: req.body.name !== undefined ? String(req.body.name).trim() : existing.name,
      code: req.body.code !== undefined ? String(req.body.code).trim().toUpperCase() : existing.code,
      type: req.body.type !== undefined ? req.body.type : existing.type,
      locationDescription:
        req.body.locationDescription !== undefined
          ? String(req.body.locationDescription).trim()
          : existing.locationDescription,
      esp32Ip: req.body.esp32Ip !== undefined ? String(req.body.esp32Ip).trim() : existing.esp32Ip,
      isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : existing.isActive,
    };

    const saved = await db.saveUnit(updated);
    await db.addLog(saved.id, 'system', `Updated unit configuration for ${saved.name}`, 'info');
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update unit' });
  }
});

// DELETE /api/units/:id - Delete a unit
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const unitId = String(req.params.id);
    const existing = await db.getUnitById(unitId);
    if (!existing) {
      res.status(404).json({ error: 'Unit not found' });
      return;
    }

    await db.deleteUnit(unitId);
    await db.addLog('global', 'system', `Removed unit ${existing.name} (${existing.code})`, 'warning');
    res.json({ success: true, message: `Unit ${existing.name} deleted` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete unit' });
  }
});

// GET /api/units/:id/status - Get latest live status
router.get('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const unitId = String(req.params.id);
    const unit = await db.getUnitById(unitId);
    if (!unit) {
      res.status(404).json({ error: 'Unit not found' });
      return;
    }

    const status = await db.getLatestStatus(unit.id);
    if (!status) {
      res.status(404).json({ error: 'No telemetry available yet for this unit' });
      return;
    }

    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch status' });
  }
});

// GET /api/units/:id/history - Get historical telemetry for charts
router.get('/:id/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const unitId = String(req.params.id);
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const history = await db.getTelemetryHistory(unitId, limit);

    // Format for Recharts chart points
    const chartPoints = history.map((st) => {
      const date = new Date(st.timestamp || Date.now());
      return {
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        timestamp: st.timestamp || date.getTime(),
        avgTemp: st.averageTemperature,
        avgHumidity: st.averageHumidity,
        fanActive: st.fanState ? 1 : 0,
        pumpActive: st.pumpState ? 1 : 0,
        sensors: st.sensors?.map((s) => ({
          id: s.id,
          location: s.location,
          position: s.position,
          pin: s.pin,
          valid: s.valid,
          temperature: s.temperature,
          humidity: s.humidity,
        })),
      };
    });

    res.json(chartPoints);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch history' });
  }
});

// POST /api/units/:id/ping - Ping unit's ESP32 directly
router.post('/:id/ping', async (req: Request, res: Response): Promise<void> => {
  try {
    const unitId = String(req.params.id);
    const unit = await db.getUnitById(unitId);
    const ip = req.body.ip || unit?.esp32Ip;
    if (!ip) {
      res.status(400).json({ error: 'IP address not specified' });
      return;
    }

    const result = await iotGateway.pingEsp32(ip);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ping failed' });
  }
});

export default router;
