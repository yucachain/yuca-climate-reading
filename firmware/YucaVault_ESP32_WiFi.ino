/*
  ============================================================
  YucaVault Climate Control System - WiFi & Web API Edition
  ============================================================

  Purpose:
  Automated environmental control for fresh cassava storage
  with real-time WiFi telemetry endpoint for the YucaVault Web Dashboard.

  SENSOR LOCATIONS:
    TOP:    A1 (GPIO 13), A2 (GPIO 14), A3 (GPIO 16)
    BOTTOM: B1 (GPIO 17), B2 (GPIO 19), B3 (GPIO 21)

  SENSOR TYPE:
    DHT22

  ACTUATORS:
    FAN  -> GPIO 18
    PUMP -> GPIO 4

  API ENDPOINT:
    GET http://<ESP32-IP>/api/status
    Returns JSON formatted telemetry for the Next.js Dashboard.
*/

#include <WiFi.h>
#include <WebServer.h>
#include <DHT.h>

// ============================================================
// WIFI CONFIGURATION (UPDATE WITH YOUR CREDENTIALS)
// ============================================================
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

WebServer server(80);

// ============================================================
// DHT SENSOR CONFIGURATION
// ============================================================
#define DHTTYPE DHT22

// TOP SENSORS
#define A1_PIN 13
#define A2_PIN 14
#define A3_PIN 16

// BOTTOM SENSORS
#define B1_PIN 17
#define B2_PIN 19
#define B3_PIN 21

// ACTUATOR PINS
#define FAN_PIN 18
#define PUMP_PIN 4

// SENSOR CONFIGURATION
#define NUM_SENSORS 6
#define MIN_VALID_SENSORS 4

// TEMPERATURE LIMITS
const float TEMP_MIN = 20.0;
const float TEMP_MAX = 30.0;

// HUMIDITY LIMITS
const float HUMIDITY_LOW = 85.0;
const float HUMIDITY_HIGH = 90.0;

// FAN LIMITS
const float FAN_TEMP_ON = 27.0;
const float FAN_TEMP_OFF = 24.0;
const float FAN_HUMIDITY_ON = 90.0;
const float FAN_HUMIDITY_OFF = 85.0;

// SENSOR OBJECTS
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

const char* sensorNames[NUM_SENSORS] = {
  "A1", "A2", "A3",
  "B1", "B2", "B3"
};

const char* sensorLocations[NUM_SENSORS] = {
  "TOP", "TOP", "TOP",
  "BOTTOM", "BOTTOM", "BOTTOM"
};

const int sensorPins[NUM_SENSORS] = {
  A1_PIN, A2_PIN, A3_PIN,
  B1_PIN, B2_PIN, B3_PIN
};

// Cached sensor readings
float currentTemps[NUM_SENSORS];
float currentHumidities[NUM_SENSORS];
bool  currentValids[NUM_SENSORS];

// SYSTEM STATES
bool fanState = true;
bool pumpState = false;
bool safetyMode = false;
int validSensorCount = 0;
float averageTemperature = 0.0;
float averageHumidity = 0.0;
String fanReason = "System Startup";
String pumpReason = "System Startup";

// SENSOR READING INTERVAL
unsigned long lastReadTime = 0;
const unsigned long READ_INTERVAL = 3000;

// Forward declarations
void readAndControlSystem();
void handleGetStatus();
void handleRoot();
void handleNotFound();

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("================================================");
  Serial.println("   YucaVault Climate Control - WiFi Edition");
  Serial.println("================================================");

  // Configure actuator pins
  pinMode(FAN_PIN, OUTPUT);
  pinMode(PUMP_PIN, OUTPUT);

  // Startup safe states
  digitalWrite(FAN_PIN, HIGH);
  fanState = true;

  digitalWrite(PUMP_PIN, LOW);
  pumpState = false;

  // Initialize sensors
  Serial.println("Initializing DHT22 sensors...");
  for (int i = 0; i < NUM_SENSORS; i++) {
    sensors[i]->begin();
    currentTemps[i] = 0.0;
    currentHumidities[i] = 0.0;
    currentValids[i] = false;
    Serial.printf("%s (GPIO %d) initialized.\n", sensorNames[i], sensorPins[i]);
  }

  // Connect to WiFi
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 20) {
    delay(500);
    Serial.print(".");
    wifiAttempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected successfully!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.println("Web API: http://" + WiFi.localIP().toString() + "/api/status");
  } else {
    Serial.println("\nWiFi Connection failed/timed out. Operating in standalone mode.");
    Serial.println("Will retry connecting periodically.");
  }

  // Configure Web Server routes
  server.on("/", HTTP_GET, handleRoot);
  server.on("/api/status", HTTP_GET, handleGetStatus);
  server.onNotFound(handleNotFound);

  // Enable CORS so browser apps on other ports or domains can fetch JSON
  server.enableCORS(true);
  server.begin();
  Serial.println("HTTP WebServer started on port 80");

  // Initial read
  readAndControlSystem();
  lastReadTime = millis();
}

// ============================================================
// MAIN LOOP
// ============================================================
void loop() {
  // Handle incoming HTTP requests from Next.js dashboard
  server.handleClient();

  // Periodic sensor read and actuator logic
  unsigned long currentTime = millis();
  if (currentTime - lastReadTime >= READ_INTERVAL) {
    lastReadTime = currentTime;
    readAndControlSystem();
  }
}

// ============================================================
// SENSOR READING + CONTROL LOGIC
// ============================================================
void readAndControlSystem() {
  float totalTemperature = 0.0;
  float totalHumidity = 0.0;
  validSensorCount = 0;

  Serial.println();
  Serial.println("================================================");
  Serial.println("             NEW SENSOR CYCLE");
  Serial.println("================================================");

  for (int i = 0; i < NUM_SENSORS; i++) {
    float t = sensors[i]->readTemperature();
    float h = sensors[i]->readHumidity();

    if (isnan(t) || isnan(h)) {
      currentValids[i] = false;
      Serial.print(sensorNames[i]);
      Serial.println(" -> SENSOR ERROR / INVALID READING");
      continue;
    }

    currentTemps[i] = t;
    currentHumidities[i] = h;
    currentValids[i] = true;
    validSensorCount++;
    totalTemperature += t;
    totalHumidity += h;

    Serial.printf("%s (%s, GPIO %d) -> Temp: %.1f °C | RH: %.1f %%\n",
                  sensorNames[i], sensorLocations[i], sensorPins[i], t, h);
  }

  Serial.printf("Valid sensors: %d / %d\n", validSensorCount, NUM_SENSORS);

  // ----------------------------------------------------------
  // SENSOR SAFETY MODE (< 4 valid sensors)
  // ----------------------------------------------------------
  if (validSensorCount < MIN_VALID_SENSORS) {
    safetyMode = true;
    pumpState = false;
    fanState = true;
    digitalWrite(PUMP_PIN, LOW);
    digitalWrite(FAN_PIN, HIGH);

    fanReason = "Safety Mode Override: < 4 sensors responding";
    pumpReason = "Safety Mode Override: Pump forced OFF";

    Serial.println("\n[WARNING] Fewer than 4 valid sensors available!");
    Serial.println("System operating in SENSOR SAFETY MODE. PUMP: OFF, FAN: ON");
    return;
  }

  safetyMode = false;
  averageTemperature = totalTemperature / validSensorCount;
  averageHumidity = totalHumidity / validSensorCount;

  Serial.println("--------------------------------------------");
  Serial.printf("AVERAGE TEMPERATURE: %.2f °C\n", averageTemperature);
  Serial.printf("AVERAGE HUMIDITY   : %.2f %%\n", averageHumidity);
  Serial.println("--------------------------------------------");

  // ----------------------------------------------------------
  // FAN CONTROL (Hysteresis)
  // ----------------------------------------------------------
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
    fanReason = "Inside Deadband (24-27°C / 85-90% RH) - Maintaining previous state";
  }

  digitalWrite(FAN_PIN, fanState ? HIGH : LOW);

  // ----------------------------------------------------------
  // PUMP CONTROL
  // ----------------------------------------------------------
  if (averageTemperature <= TEMP_MIN) {
    pumpState = false;
    pumpReason = "Chamber too cold (<= 20°C). Pump OFF.";
  } else if (averageTemperature >= TEMP_MAX) {
    pumpState = true;
    pumpReason = "Chamber too hot (>= 30°C). Pump ON for cooling.";
  } else {
    // 20°C < Temp < 30°C: Humidity controls pump
    if (averageHumidity < HUMIDITY_LOW) {
      pumpState = true;
      pumpReason = "Low Humidity (< 85%). Humidifying chamber.";
    } else if (averageHumidity >= HUMIDITY_LOW && averageHumidity < HUMIDITY_HIGH) {
      pumpReason = "Preferred RH Zone (85% - 90%). Maintaining state.";
    } else {
      pumpState = false;
      pumpReason = "Target Humidity Reached (>= 90%). Pump OFF.";
    }
  }

  digitalWrite(PUMP_PIN, pumpState ? HIGH : LOW);

  Serial.printf("FAN : %s (%s)\n", fanState ? "ON" : "OFF", fanReason.c_str());
  Serial.printf("PUMP: %s (%s)\n", pumpState ? "ON" : "OFF", pumpReason.c_str());
}

// ============================================================
// HTTP API ENDPOINT: /api/status (JSON)
// ============================================================
void handleGetStatus() {
  // Build JSON response
  String json = "{";
  json += "\"system\":\"YucaVault\",";
  json += "\"uptime\":" + String(millis()) + ",";
  json += "\"validSensors\":" + String(validSensorCount) + ",";
  json += "\"minValidSensors\":" + String(MIN_VALID_SENSORS) + ",";
  json += "\"totalSensors\":" + String(NUM_SENSORS) + ",";
  json += "\"safetyMode\":" + String(safetyMode ? "true" : "false") + ",";
  json += "\"averageTemperature\":" + String(averageTemperature, 2) + ",";
  json += "\"averageHumidity\":" + String(averageHumidity, 2) + ",";
  json += "\"fanState\":" + String(fanState ? "true" : "false") + ",";
  json += "\"pumpState\":" + String(pumpState ? "true" : "false") + ",";
  json += "\"fanReason\":\"" + fanReason + "\",";
  json += "\"pumpReason\":\"" + pumpReason + "\",";

  json += "\"sensors\":[";
  for (int i = 0; i < NUM_SENSORS; i++) {
    if (i > 0) json += ",";
    json += "{";
    json += "\"id\":\"" + String(sensorNames[i]) + "\",";
    json += "\"location\":\"" + String(sensorLocations[i]) + "\",";
    json += "\"pin\":" + String(sensorPins[i]) + ",";
    json += "\"valid\":" + String(currentValids[i] ? "true" : "false") + ",";
    json += "\"temperature\":" + String(currentTemps[i], 1) + ",";
    json += "\"humidity\":" + String(currentHumidities[i], 1);
    json += "}";
  }
  json += "]}";

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
  server.send(200, "application/json", json);
}

void handleRoot() {
  String html = "<!DOCTYPE html><html><head><title>YucaVault ESP32</title></head>";
  html += "<body style='font-family:sans-serif;padding:2rem;background:#111;color:#eee;'>";
  html += "<h2>YucaVault Climate Node Online</h2>";
  html += "<p>IP: " + WiFi.localIP().toString() + "</p>";
  html += "<p><a style='color:#38bdf8;' href='/api/status'>View JSON Telemetry (/api/status)</a></p>";
  html += "</body></html>";
  server.send(200, "text/html", html);
}

void handleNotFound() {
  server.send(404, "application/json", "{\"error\":\"Not Found\"}");
}
