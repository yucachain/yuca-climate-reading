'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Code2, Cpu } from 'lucide-react';

interface Esp32CodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ESP32_SKETCH = `/*
  ============================================================
  YucaChain - Climate Control System (WiFi & Web API)
  ============================================================
  Automated environmental control for fresh cassava storage.
  Runs identically across YucaVault (Transport) and YucaHub (Stationary).

  SENSOR LOCATIONS:
    TOP:    A1 (GPIO 13), A2 (GPIO 14), A3 (GPIO 16)
    BOTTOM: B1 (GPIO 17), B2 (GPIO 19), B3 (GPIO 21)

  ACTUATORS:
    FAN  -> GPIO 18
    PUMP -> GPIO 4

  API ENDPOINT:
    GET http://<ESP32-IP>/api/status
*/

#include <WiFi.h>
#include <WebServer.h>
#include <DHT.h>

// Enter your WiFi credentials here:
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

WebServer server(80);

#define DHTTYPE DHT22

// PINS
#define A1_PIN 13
#define A2_PIN 14
#define A3_PIN 16
#define B1_PIN 17
#define B2_PIN 19
#define B3_PIN 21
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
const char* sensorLocations[NUM_SENSORS] = { "TOP", "TOP", "TOP", "BOTTOM", "BOTTOM", "BOTTOM" };
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
const unsigned long READ_INTERVAL = 3000;

void setup() {
  Serial.begin(115200);
  pinMode(FAN_PIN, OUTPUT);
  pinMode(PUMP_PIN, OUTPUT);
  digitalWrite(FAN_PIN, HIGH);
  digitalWrite(PUMP_PIN, LOW);

  for (int i = 0; i < NUM_SENSORS; i++) {
    sensors[i]->begin();
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi Connected! IP: " + WiFi.localIP().toString());

  server.on("/api/status", HTTP_GET, handleGetStatus);
  server.enableCORS(true);
  server.begin();
}

void loop() {
  server.handleClient();
  unsigned long now = millis();
  if (now - lastReadTime >= READ_INTERVAL) {
    lastReadTime = now;
    readAndControlSystem();
  }
}

void readAndControlSystem() {
  float totalT = 0, totalH = 0;
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
    totalT += t;
    totalH += h;
  }

  if (validSensorCount < MIN_VALID_SENSORS) {
    safetyMode = true;
    pumpState = false;
    fanState = true;
    digitalWrite(PUMP_PIN, LOW);
    digitalWrite(FAN_PIN, HIGH);
    fanReason = "Safety Mode: < 4 sensors active";
    pumpReason = "Safety Mode: Pump OFF";
    return;
  }

  safetyMode = false;
  averageTemperature = totalT / validSensorCount;
  averageHumidity = totalH / validSensorCount;

  // Fan Hysteresis
  if (averageTemperature >= FAN_TEMP_ON || averageHumidity >= FAN_HUMIDITY_ON) {
    fanState = true;
    fanReason = "Temp >= 27°C or RH >= 90%";
  } else if (averageTemperature <= FAN_TEMP_OFF && averageHumidity <= FAN_HUMIDITY_OFF) {
    fanState = false;
    fanReason = "Temp <= 24°C and RH <= 85%";
  }

  // Pump Control
  if (averageTemperature <= TEMP_MIN) {
    pumpState = false;
    pumpReason = "Chamber <= 20°C (Pump OFF)";
  } else if (averageTemperature >= TEMP_MAX) {
    pumpState = true;
    pumpReason = "Chamber >= 30°C (Pump ON)";
  } else {
    if (averageHumidity < HUMIDITY_LOW) {
      pumpState = true;
      pumpReason = "RH < 85% (Pump ON)";
    } else if (averageHumidity >= HUMIDITY_HIGH) {
      pumpState = false;
      pumpReason = "RH >= 90% (Pump OFF)";
    }
  }

  digitalWrite(FAN_PIN, fanState ? HIGH : LOW);
  digitalWrite(PUMP_PIN, pumpState ? HIGH : LOW);
}

void handleGetStatus() {
  String json = "{\\"system\\":\\"YucaChain\\",";
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
    json += "{\\"id\\":\\"" + String(sensorNames[i]) + "\\",";
    json += "\\"location\\":\\"" + String(sensorLocations[i]) + "\\",";
    json += "\\"pin\\":" + String(sensorPins[i]) + ",";
    json += "\\"valid\\":" + String(currentValids[i] ? "true" : "false") + ",";
    json += "\\"temperature\\":" + String(currentTemps[i], 1) + ",";
    json += "\\"humidity\\":" + String(currentHumidities[i], 1) + "}";
  }
  json += "]}";
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}
`;

export const Esp32CodeModal: React.FC<Esp32CodeModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(ESP32_SKETCH);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-3xl border border-emerald-900/15 p-6 shadow-2xl space-y-5 relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-emerald-950">YucaChain ESP32 WiFi Firmware</h3>
              <p className="text-xs text-slate-500 font-medium">
                Universal firmware sketch for both <strong className="text-emerald-900">YucaVault (Transport)</strong> and{' '}
                <strong className="text-emerald-900">YucaHub (Stationary)</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pinout Quick Cards */}
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 text-[10px] uppercase block font-bold">Top DHT22</span>
            <span className="text-emerald-950 font-mono font-black">A1: 13, A2: 14, A3: 16</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 text-[10px] uppercase block font-bold">Bottom DHT22</span>
            <span className="text-emerald-950 font-mono font-black">B1: 17, B2: 19, B3: 21</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-emerald-800 text-[10px] uppercase block font-bold">Ventilation Fan</span>
            <span className="text-emerald-950 font-mono font-black">GPIO 18</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-amber-800 text-[10px] uppercase block font-bold">Mist Pump</span>
            <span className="text-amber-950 font-mono font-black">GPIO 4</span>
          </div>
        </div>

        {/* Code Preview Container */}
        <div className="flex-1 min-h-0 relative rounded-2xl border border-slate-800 bg-[#0b131e] overflow-hidden flex flex-col shadow-inner">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#141e2e] border-b border-slate-700/60 text-xs">
            <span className="font-mono text-slate-300 flex items-center gap-1.5 font-medium">
              <Code2 className="w-3.5 h-3.5 text-emerald-400" />
              firmware/YucaVault_ESP32_WiFi.ino
            </span>
            <button
              onClick={handleCopy}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied to Clipboard!' : 'Copy Sketch'}
            </button>
          </div>
          <pre className="flex-1 p-4 overflow-auto text-xs font-mono text-slate-200 leading-relaxed select-all">
            {ESP32_SKETCH}
          </pre>
        </div>

        {/* Quick Flashing Steps */}
        <div className="shrink-0 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-xs text-emerald-950 space-y-1">
          <span className="font-bold text-emerald-950 block">Flashing Steps for any YucaChain Node:</span>
          <ol className="list-decimal list-inside space-y-0.5 text-emerald-900 leading-relaxed text-[11px] font-medium">
            <li>Open the sketch in Arduino IDE (Board: <strong className="text-emerald-950">ESP32 Dev Module</strong>).</li>
            <li>Configure your local WiFi credentials on lines 28–29: <code className="text-emerald-800 font-mono font-bold">&quot;YOUR_WIFI_SSID&quot;</code> and <code className="text-emerald-800 font-mono font-bold">&quot;YOUR_PASSWORD&quot;</code>.</li>
            <li>Flash to the ESP32, verify the Serial Monitor (115200 baud) for its IP address, and assign that IP to the respective unit in the Settings menu!</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
