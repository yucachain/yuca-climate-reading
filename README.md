# YucaVault & YucaHub Cassava Cold Chain - IoT Telemetry System

A full-stack IoT monitoring and automated climate control platform for fresh cassava root preservation, architected as an **npm workspaces monorepo** with a **React / Next.js frontend**, a **Node.js Express backend**, a **PostgreSQL database (Prisma ORM)**, and **ESP32 dual-mode firmware**.

---

## 🏗 Monorepo Architecture

```
YucaVault-Climate-Reading/
├── apps/
│   ├── backend/                     # Node.js + Express + PostgreSQL (Prisma)
│   │   ├── prisma/
│   │   │   └── schema.prisma        # PostgreSQL Schema (Units, Telemetry, Sensors, Logs, Settings)
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── db.ts            # Prisma client + resilient cache store
│   │   │   │   └── seed.ts          # Default 3 units seed script
│   │   │   ├── routes/
│   │   │   │   ├── units.ts         # Unit CRUD + Ping + Status + History
│   │   │   │   ├── telemetry.ts     # ESP32 Direct Ingest + Telemetry status
│   │   │   │   ├── logs.ts          # Activity & Alert logs
│   │   │   │   ├── settings.ts      # Polling & Gateway settings
│   │   │   │   └── health.ts        # Health check & DB connection status
│   │   │   ├── services/
│   │   │   │   └── gateway.ts       # Hybrid IoT Gateway (Periodic polling worker & push handler)
│   │   │   ├── types.ts             # TypeScript interfaces
│   │   │   └── server.ts            # Express server entry point (Port 5000)
│   │   ├── .env.example
│   │   └── package.json
│   │
│   └── frontend/                    # Next.js 16 + React 19 + TailwindCSS + Recharts
│       ├── src/
│       │   ├── app/
│       │   │   ├── globals.css
│       │   │   ├── layout.tsx
│       │   │   └── page.tsx         # Dashboard connected to Express API
│       │   ├── components/          # UI Components (Header, ActuatorControls, ClimateChart, etc.)
│       │   ├── lib/
│       │   │   ├── api.ts           # Centralized API service connecting to backend
│       │   │   └── types.ts         # Frontend data types
│       │   └── public/
│       ├── .env.example
│       └── package.json
│
├── firmware/
│   └── YucaVault_ESP32_WiFi.ino     # ESP32 C++ Arduino Sketch (Polling + Direct Push)
├── package.json                     # Monorepo root workspace configuration
└── README.md
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v20 / v26)
- **PostgreSQL**: Local PostgreSQL server running (or Docker: `docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres`)

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup (PostgreSQL)
Ensure your `.env` in `apps/backend/.env` has your PostgreSQL connection string:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/yucavault?schema=public"
PORT=5000
POLL_INTERVAL_MS=3000
FRONTEND_URL="http://localhost:3000"
```

Push schema to PostgreSQL and seed initial units:
```bash
npm run prisma:push --workspace=@yucavault/backend
npm run seed --workspace=@yucavault/backend
```

### 4. Run Both Frontend and Backend Concurrently
```bash
npm run dev
```
- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Express Backend API**: [http://localhost:5000](http://localhost:5000)
- **Backend Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

You can also run them individually:
```bash
npm run dev:backend   # Express API only (Port 5000)
npm run dev:frontend  # Next.js dashboard only (Port 3000)
```

---

## 🖧 ESP32 Fleet (2 Vaults & 1 Hub)

The system is configured for 3 physical hardware nodes:
1. **Node 1: YucaVault #1** (Transport Truck #1)
   - `UNIT_ID = "vault-1"`
   - `UNIT_CODE = "TR-01"`
   - Default IP: `192.168.1.151`
2. **Node 2: YucaVault #2** (Transport Truck #2)
   - `UNIT_ID = "vault-2"`
   - `UNIT_CODE = "TR-02"`
   - Default IP: `192.168.1.152`
3. **Node 3: YucaHub Station** (Central Stationary Cold Facility)
   - `UNIT_ID = "hub-1"`
   - `UNIT_CODE = "ST-01"`
   - Default IP: `192.168.1.150`

### Dual-Mode Hybrid IoT Gateway
The Express backend supports two simultaneous communication modes:
1. **Backend Polling**: The Express server background worker automatically queries `GET http://<ESP32_IP>/api/status` at configurable intervals (e.g. 3000ms), saving readings to PostgreSQL and monitoring actuator changes.
2. **Direct ESP32 Push**: Each ESP32 can send HTTP POST requests directly to `http://<SERVER_IP>:5000/api/telemetry/ingest`.

---

## 📡 REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend server & PostgreSQL health status |
| `GET` | `/api/units` | List all storage units with latest telemetry |
| `POST` | `/api/units` | Register a new storage unit |
| `PUT` | `/api/units/:id` | Update unit details and ESP32 IP |
| `DELETE` | `/api/units/:id` | Deactivate / remove a unit |
| `GET` | `/api/units/:id/status` | Get latest telemetry for a unit |
| `GET` | `/api/units/:id/history` | Get historical readings for Recharts graphs |
| `POST` | `/api/units/:id/ping` | Ping unit's ESP32 directly |
| `POST` | `/api/telemetry/ingest` | ESP32 direct push ingestion endpoint |
| `GET` | `/api/telemetry/status` | Current telemetry status map across all units |
| `GET` | `/api/logs` | Fetch system audit & actuator state change logs |
| `DELETE` | `/api/logs` | Clear logs |
| `GET` | `/api/settings` | Get telemetry polling interval & gateway settings |
| `PUT` | `/api/settings` | Update polling interval & gateway settings |
