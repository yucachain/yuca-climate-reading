'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Code2, Cpu, Radio, Network } from 'lucide-react';

interface Esp32CodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ESP32_SKETCH = `/*
  ============================================================
  YucaVault & YucaHub Climate Control System - Dual Mode IoT
  ============================================================

  Supports:
    - 2 Transport Vaults (vault-1: TR-01, vault-2: TR-02)
    - 1 Stationary Hub (hub-1: ST-01)

  HYBRID IOT GATEWAY COMMUNICATION:
    1. Polling: Express backend queries GET http://<ESP32-IP>/api/status
    2. Direct Push: ESP32 POSTs JSON telemetry directly to:
       POST http://<SERVER-IP>:5000/api/telemetry/ingest

  SENSOR LOCATIONS (TWO SIDES - 3-POINT DIAGONAL SLANT):
    LEFT SIDE:  A1 (Top Slant, GPIO 13), A2 (Mid Slant, GPIO 14), A3 (Bot Slant, GPIO 16)
    RIGHT SIDE: B1 (Top Slant, GPIO 17), B2 (Mid Slant, GPIO 19), B3 (Bot Slant, GPIO 21)

  ACTUATORS:
    FAN  -> GPIO 18
    PUMP -> GPIO 4
*/

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <DHT.h>

// ============================================================
// NODE IDENTITY (CHANGE PER DEVICE: vault-1, vault-2, or hub-1)
// ============================================================
const char* UNIT_ID   = "vault-1";             // "vault-1", "vault-2", or "hub-1"
const char* UNIT_CODE = "TR-01";               // "TR-01", "TR-02", or "ST-01"
const char* UNIT_NAME = "YucaVault #1";        // "YucaVault #1", "YucaVault #2", "YucaHub Station"

// ============================================================
// WIFI CONFIGURATION
// ============================================================
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ============================================================
// BACKEND SERVER (For Direct Push Mode)
// ============================================================
const bool  ENABLE_DIRECT_PUSH = true;
const char* BACKEND_SERVER_URL = "http://192.168.1.100:5000/api/telemetry/ingest";
const unsigned long PUSH_INTERVAL_MS = 3000;

WebServer server(80);

#define DHTTYPE DHT22

// LEFT WALL PINS
#define A1_PIN 13
#define A2_PIN 14
#define A3_PIN 16

// RIGHT WALL PINS
#define B1_PIN 17
#define B2_PIN 19
#define B3_PIN 21

// ACTUATORS
#define FAN_PIN 18
#define PUMP_PIN 4

#define NUM_SENSORS 6
#define MIN_VALID_SENSORS 4

const float TEMP_MIN = 20.0;
const float TEMP_MAX = 30.0;
const float HUMIDITY_LOW = 85.0;
const float HUMIDITY_HIGH = 90.0;

const float FAN_TEMP_ON = 27.0;
const float FAN_TEMP_OFF = 24.0;
const float FAN_HUMIDITY_ON = 90.0;
const float FAN_HUMIDITY_OFF = 85.0;

DHT sensorA1(A1_PIN, DHTTYPE);
DHT sensorA2(A2_PIN, DHTTYPE);
DHT sensorA3(A3_PIN, DHTTYPE);
DHT sensorB1(B1_PIN, DHTTYPE);
DHT sensorB2(B2_PIN, DHTTYPE);
DHT sensorB3(B3_PIN, DHTTYPE);

DHT* sensors[NUM_SENSORS] = {
  &sensorA1, &sensorA2, &sensorA3,
  &sensorB1, &sensorB2, &sensorB3
};

const char* sensorNames[NUM_SENSORS] = { "A1", "A2", "A3", "B1", "B2", "B3" };
const char* sensorLocations[NUM_SENSORS] = { "LEFT", "LEFT", "LEFT", "RIGHT", "RIGHT", "RIGHT" };
const int sensorPins[NUM_SENSORS] = { A1_PIN, A2_PIN, A3_PIN, B1_PIN, B2_PIN, B3_PIN };

float currentTemps[NUM_SENSORS];
float currentHumidities[NUM_SENSORS];
bool  currentValids[NUM_SENSORS];

bool fanState = true;
bool pumpState = false;
bool safetyMode = false;
int validSensorCount = 0;
float averageTemperature = 0.0;
float averageHumidity = 0.0;
String fanReason = "System Startup";
String pumpReason = "System Startup";

unsigned long lastReadTime = 0;
unsigned long lastPushTime = 0;
const unsigned long READ_INTERVAL = 3000;

void readAndControlSystem();
void handleGetStatus();
void handleRoot();
void handleNotFound();
String buildTelemetryJson();
void pushTelemetryToBackend();

void setup() {
  Serial.begin(115200);
  pinMode(FAN_PIN, OUTPUT);
  pinMode(PUMP_PIN, OUTPUT);

  digitalWrite(FAN_PIN, HIGH);
  fanState = true;
  digitalWrite(PUMP_PIN, LOW);
  pumpState = false;

  for (int i = 0; i < NUM_SENSORS; i++) {
    sensors[i]->begin();
    currentTemps[i] = 0.0;
    currentHumidities[i] = 0.0;
    currentValids[i] = false;
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  server.on("/", HTTP_GET, handleRoot);
  server.on("/api/status", HTTP_GET, handleGetStatus);
  server.onNotFound(handleNotFound);

  server.enableCORS(true);
  server.begin();

  readAndControlSystem();
  lastReadTime = millis();
}

void loop() {
  server.handleClient();

  unsigned long now = millis();
  if (now - lastReadTime >= READ_INTERVAL) {
    lastReadTime = now;
    readAndControlSystem();
  }

  if (ENABLE_DIRECT_PUSH && WiFi.status() == WL_CONNECTED && (now - lastPushTime >= PUSH_INTERVAL_MS)) {
    lastPushTime = now;
    pushTelemetryToBackend();
  }
}

void readAndControlSystem() {
  float totalTemperature = 0.0;
  float totalHumidity = 0.0;
  validSensorCount = 0;

  for (int i = 0; i < NUM_SENSORS; i++) {
    float t = sensors[i]->readTemperature();
    float h = sensors[i]->readHumidity();

    if (isnan(t) || isnan(h)) {
      currentValids[i] = false;
      continue;
    }

    currentTemps[i] = t;
    currentHumidities[i] = h;
    currentValids[i] = true;
    validSensorCount++;
    totalTemperature += t;
    totalHumidity += h;
  }

  if (validSensorCount < MIN_VALID_SENSORS) {
    safetyMode = true;
    pumpState = false;
    fanState = true;
    digitalWrite(PUMP_PIN, LOW);
    digitalWrite(FAN_PIN, HIGH);
    fanReason = "Safety Mode: < 4 sensors responding";
    pumpReason = "Safety Mode: Pump halted";
    return;
  }

  safetyMode = false;
  averageTemperature = totalTemperature / validSensorCount;
  averageHumidity = totalHumidity / validSensorCount;

  if (averageTemperature >= FAN_TEMP_ON || averageHumidity >= FAN_HUMIDITY_ON) {
    fanState = true;
    if (averageTemperature >= FAN_TEMP_ON && averageHumidity >= FAN_HUMIDITY_ON) {
      fanReason = "High Temp (>=27°C) & High RH (>=90%)";
    } else if (averageTemperature >= FAN_TEMP_ON) {
      fanReason = "High Temp Trigger (>=27.0°C)";
    } else {
      fanReason = "High Humidity Trigger (>=90.0%)";
    }
  } else if (averageTemperature <= FAN_TEMP_OFF && averageHumidity <= FAN_HUMIDITY_OFF) {
    fanState = false;
    fanReason = "Temp <= 24°C AND RH <= 85% (Ventilation satisfied)";
  } else {
    fanReason = "Conditions in deadband (24-27°C / 85-90% RH)";
  }

  if (averageTemperature <= TEMP_MIN) {
    pumpState = false;
    pumpReason = "Chamber cold (<= 20°C). Pump OFF";
  } else if (averageTemperature >= TEMP_MAX) {
    pumpState = true;
    pumpReason = "Chamber hot (>= 30°C). Cooling Mist ON";
  } else {
    if (averageHumidity < HUMIDITY_LOW) {
      pumpState = true;
      pumpReason = "Low Humidity (< 85%). Humidifying";
    } else if (averageHumidity >= HUMIDITY_LOW && averageHumidity < HUMIDITY_HIGH) {
      pumpReason = "Preferred RH Zone (85-90%). State maintained";
    } else {
      pumpState = false;
      pumpReason = "Target Humidity Reached (>= 90%). Pump OFF";
    }
  }

  digitalWrite(FAN_PIN, fanState ? HIGH : LOW);
  digitalWrite(PUMP_PIN, pumpState ? HIGH : LOW);
}

String buildTelemetryJson() {
  String json = "{";
  json += "\\"system\\":\\"YucaChain - " + String(UNIT_NAME) + "\\",";
  json += "\\"unitId\\":\\"" + String(UNIT_ID) + "\\",";
  json += "\\"code\\":\\"" + String(UNIT_CODE) + "\\",";
  json += "\\"uptime\\":" + String(millis()) + ",";
  json += "\\"validSensors\\":" + String(validSensorCount) + ",";
  json += "\\"minValidSensors\\":" + String(MIN_VALID_SENSORS) + ",";
  json += "\\"totalSensors\\":" + String(NUM_SENSORS) + ",";
  json += "\\"safetyMode\\":" + String(safetyMode ? "true" : "false") + ",";
  json += "\\"averageTemperature\\":" + String(averageTemperature, 2) + ",";
  json += "\\"averageHumidity\\":" + String(averageHumidity, 2) + ",";
  json += "\\"fanState\\":" + String(fanState ? "true" : "false") + ",";
  json += "\\"pumpState\\":" + String(pumpState ? "true" : "false") + ",";
  json += "\\"fanReason\\":\\"" + fanReason + "\\",";
  json += "\\"pumpReason\\":\\"" + pumpReason + "\\",";
  json += "\\"sensors\\":[";
  for (int i = 0; i < NUM_SENSORS; i++) {
    if (i > 0) json += ",";
    json += "{";
    json += "\\"id\\":\\"" + String(sensorNames[i]) + "\\",";
    json += "\\"location\\":\\"" + String(sensorLocations[i]) + "\\",";
    json += "\\"pin\\":" + String(sensorPins[i]) + ",";
    json += "\\"valid\\":" + String(currentValids[i] ? "true" : "false") + ",";
    json += "\\"temperature\\":" + String(currentTemps[i], 1) + ",";
    json += "\\"humidity\\":" + String(currentHumidities[i], 1);
    json += "}";
  }
  json += "]}";
  return json;
}

void pushTelemetryToBackend() {
  HTTPClient http;
  http.begin(BACKEND_SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.POST(buildTelemetryJson());
  http.end();
}

void handleGetStatus() {
  String json = buildTelemetryJson();
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.send(200, "application/json", json);
}

void handleRoot() {
  String html = "<!DOCTYPE html><html><head><title>YucaChain Node</title></head>";
  html += "<body style='font-family:sans-serif;padding:2rem;background:#0d1f14;color:#e7f5ed;'>";
  html += "<h2>YucaChain Cold Chain Node</h2>";
  html += "<p><strong>Unit:</strong> " + String(UNIT_NAME) + " (" + String(UNIT_CODE) + ")</p>";
  html += "<p><strong>Local IP:</strong> " + WiFi.localIP().toString() + "</p>";
  html += "<p><a style='color:#34d399;' href='/api/status'>View Live JSON Telemetry (/api/status)</a></p>";
  html += "</body></html>";
  server.send(200, "text/html", html);
}

void handleNotFound() {
  server.send(404, "application/json", "{\\"error\\":\\"Not Found\\"}");
}
`;

export const Esp32CodeModal: React.FC<Esp32CodeModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(ESP32_SKETCH);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/25 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl border border-emerald-900/15 p-6 sm:p-7 shadow-2xl space-y-5 relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Code2 className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-emerald-950">ESP32 Arduino C++ Firmware</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                  Hybrid IoT Mode
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Flash this sketch to each ESP32 (YucaVault #1, YucaVault #2, and YucaHub Station)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Unit Fleet Quick Guide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div className="font-extrabold text-emerald-950 flex items-center gap-1.5 mb-1">
              <Radio className="w-3.5 h-3.5 text-emerald-700" />
              Node 1: YucaVault #1 (Transit)
            </div>
            <p className="text-slate-500 font-mono text-[11px]">UNIT_ID = &quot;vault-1&quot;</p>
            <p className="text-slate-500 font-mono text-[11px]">UNIT_CODE = &quot;TR-01&quot;</p>
            <p className="text-emerald-800 font-mono text-[11px] font-bold">IP: 192.168.1.151</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div className="font-extrabold text-emerald-950 flex items-center gap-1.5 mb-1">
              <Radio className="w-3.5 h-3.5 text-emerald-700" />
              Node 2: YucaVault #2 (Transit)
            </div>
            <p className="text-slate-500 font-mono text-[11px]">UNIT_ID = &quot;vault-2&quot;</p>
            <p className="text-slate-500 font-mono text-[11px]">UNIT_CODE = &quot;TR-02&quot;</p>
            <p className="text-emerald-800 font-mono text-[11px] font-bold">IP: 192.168.1.152</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div className="font-extrabold text-emerald-950 flex items-center gap-1.5 mb-1">
              <Network className="w-3.5 h-3.5 text-emerald-700" />
              Node 3: YucaHub Station (Central)
            </div>
            <p className="text-slate-500 font-mono text-[11px]">UNIT_ID = &quot;hub-1&quot;</p>
            <p className="text-slate-500 font-mono text-[11px]">UNIT_CODE = &quot;ST-01&quot;</p>
            <p className="text-emerald-800 font-mono text-[11px] font-bold">IP: 192.168.1.150</p>
          </div>
        </div>

        {/* Code Block Container */}
        <div className="relative flex-1 min-h-[300px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>firmware/YucaVault_ESP32_WiFi.ino</span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono overflow-auto flex-1 text-slate-300 leading-relaxed selection:bg-emerald-800 selection:text-white">
            <code>{ESP32_SKETCH}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
