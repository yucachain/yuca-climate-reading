import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/db.js';
import { iotGateway } from './services/gateway.js';

import healthRoutes from './routes/health.js';
import unitsRoutes from './routes/units.js';
import telemetryRoutes from './routes/telemetry.js';
import logsRoutes from './routes/logs.js';
import settingsRoutes from './routes/settings.js';

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Enable CORS for frontend and ESP32 clients
app.use(
  cors({
    origin: '*', // Allow local frontend and any network client
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic request logging
app.use((req, _res, next) => {
  if (req.path !== '/api/health' && req.path !== '/api/telemetry/status') {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  }
  next();
});

// Mount API routes
app.use('/api/health', healthRoutes);
app.use('/api/units', unitsRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/settings', settingsRoutes);

// Root route
app.get('/', (_req, res) => {
  res.json({
    name: 'YucaVault & YucaHub Climate API Gateway',
    version: '1.0.0',
    documentation: {
      health: 'GET /api/health',
      units: 'GET /api/units',
      telemetry: 'GET /api/telemetry/status',
      ingestTelemetry: 'POST /api/telemetry/ingest',
      logs: 'GET /api/logs',
      settings: 'GET /api/settings',
    },
  });
});

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Server Initialization
async function startServer() {
  try {
    console.log('----------------------------------------------------');
    console.log('   Starting YucaVault Climate Express Backend        ');
    console.log('----------------------------------------------------');

    // Initialize database
    await initDatabase();

    // Start IoT Gateway background polling worker
    await iotGateway.start();

    app.listen(PORT, () => {
      console.log(`\n🚀 YucaVault Express Server running at http://localhost:${PORT}`);
      console.log(`📡 ESP32 Ingestion endpoint: http://localhost:${PORT}/api/telemetry/ingest`);
      console.log(`🌐 Frontend allowed origin: ${FRONTEND_URL}`);
      console.log('----------------------------------------------------\n');
    });
  } catch (err) {
    console.error('Fatal server startup error:', err);
    process.exit(1);
  }
}

startServer();
