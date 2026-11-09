#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

const char* WIFI_SSID        = "HydroSense";
const char* WIFI_PASSWORD    = "12345678";
const char* API_ENDPOINT_URL = "https://hydrosense-five.vercel.app/api/hydrosense";
const char* API_KEY          = "";
const unsigned long INTERVAL_MS = 5000;

const bool FAKE_DHT     = false;
const bool SOIL_ENABLED = false;

const int SOIL_RAW_DRY = 3500;
const int SOIL_RAW_WET = 1500;

const uint8_t PIN_SOIL  = 34;
const int8_t  PIN_SOIL_POWER = -1;
const uint8_t PIN_DHT   = 4;
const uint8_t PIN_FLOAT = 27;
const uint8_t PIN_RELAY = 26;
const uint8_t PIN_SDA   = 21;
const uint8_t PIN_SCL   = 22;

const bool RELAY_ACTIVE_LOW            = true;
const bool FLOAT_CLOSED_MEANS_WATER_OK = true;

const uint8_t       LCD_ADDR            = 0x27;
const unsigned long HTTP_TIMEOUT_MS     = 4000;
const unsigned long FAILSAFE_TIMEOUT_MS = 30000;
const unsigned long WIFI_RETRY_MS       = 10000;
const unsigned long FLOAT_DEBOUNCE_MS   = 200;

#define DHT_TYPE DHT22
DHT dht(PIN_DHT, DHT_TYPE);
LiquidCrystal_I2C lcd(LCD_ADDR, 16, 2);

byte degreeChar[8] = {0x07, 0x05, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00};

float temperature = NAN;
float humidity    = NAN;
float soilPct     = NAN;
bool  waterOk     = false;
bool  pumpOn      = false;

bool          floatRaw        = false;
unsigned long floatChangedAt  = 0;

unsigned long lastSendAt       = 0;
unsigned long lastWifiTryAt    = 0;
unsigned long lastServerOkAt   = 0;
bool          everServerOk     = false;

void writeRelay(bool on) {
  bool level = RELAY_ACTIVE_LOW ? !on : on;
  digitalWrite(PIN_RELAY, level ? HIGH : LOW);
}

void setPump(bool wantOn) {
  if (wantOn && !waterOk) {
    Serial.println("[PUMP] ปฏิเสธคำสั่งเปิด: น้ำหมด (Dry-run Protection)");
    wantOn = false;
  }
  if (wantOn != pumpOn) {
    Serial.printf("[PUMP] %s\n", wantOn ? "ON" : "OFF");
  }
  pumpOn = wantOn;
  writeRelay(pumpOn);
}

bool readDHT() {
  if (FAKE_DHT) {
    temperature = 28.0f + 1.5f * sinf(millis() / 30000.0f);
    humidity = 70.0f;
    Serial.println("[DHT] FAKE_DHT เปิดอยู่: ใช้ค่าจำลอง ไม่ใช่ค่าจริง");
    return true;
  }
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (isnan(t) || isnan(h)) {
    Serial.println("[DHT] อ่านค่าไม่สำเร็จ");
    return false;
  }
  temperature = t;
  humidity = h;
  return true;
}

void readSoil() {
  if (!SOIL_ENABLED) { soilPct = NAN; return; }
  if (PIN_SOIL_POWER >= 0) { digitalWrite(PIN_SOIL_POWER, HIGH); delay(30); }
  long sum = 0;
  for (int i = 0; i < 10; i++) { sum += analogRead(PIN_SOIL); delay(5); }
  if (PIN_SOIL_POWER >= 0) digitalWrite(PIN_SOIL_POWER, LOW);

  int raw = (int)(sum / 10);
  float pct = (float)(raw - SOIL_RAW_DRY) * 100.0f / (float)(SOIL_RAW_WET - SOIL_RAW_DRY);
  soilPct = constrain(pct, 0.0f, 100.0f);
  Serial.printf("[SOIL] raw=%d -> %.0f%%\n", raw, soilPct);
}

bool readWaterRaw() {
  bool closed = (digitalRead(PIN_FLOAT) == LOW);
  return FLOAT_CLOSED_MEANS_WATER_OK ? closed : !closed;
}

void updateWater() {
  bool raw = readWaterRaw();
  unsigned long now = millis();
  if (raw != floatRaw) {
    floatRaw = raw;
    floatChangedAt = now;
  }
  if (floatRaw != waterOk && (now - floatChangedAt) >= FLOAT_DEBOUNCE_MS) {
    waterOk = floatRaw;
    Serial.printf("[WATER] %s\n", waterOk ? "OK" : "LOW");
    if (!waterOk && pumpOn) {
      Serial.println("[PUMP] น้ำหมด -> ตัดปั๊มทันที");
      setPump(false);
    }
  }
}

void updateLCD() {
  char l1[17], l2[17];
  if (isnan(temperature)) {
    snprintf(l1, sizeof(l1), "T:--.-  H:--%%   ");
    l1[16] = 0;
  } else if (SOIL_ENABLED) {

    if (isnan(soilPct)) snprintf(l1, sizeof(l1), "%.0f\x01 H%.0f%% S--%%", temperature, humidity);
    else                snprintf(l1, sizeof(l1), "%.0f\x01 H%.0f%% S%.0f%%", temperature, humidity, soilPct);
  } else {
    snprintf(l1, sizeof(l1), "T:%.1f\x01" "C H:%.0f%%", temperature, humidity);
  }
  snprintf(l2, sizeof(l2), "W:%-3s Pump:%-3s", waterOk ? "OK" : "LOW", pumpOn ? "ON" : "OFF");

  lcd.setCursor(0, 0); lcd.print(String(l1) + "                ");
  lcd.setCursor(0, 1); lcd.print(String(l2) + "                ");
}

void lcdMessage(const char* a, const char* b = "") {
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print(a);
  lcd.setCursor(0, 1); lcd.print(b);
}

void connectWiFi() {
  Serial.printf("[WiFi] เชื่อมต่อ %s ...\n", WIFI_SSID);
  lcdMessage("WiFi connecting", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    updateWater();
    delay(100);
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WiFi] เชื่อมต่อแล้ว IP=%s RSSI=%d\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println("[WiFi] ยังเชื่อมต่อไม่ได้ จะลองใหม่");
  }
}

void ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  unsigned long now = millis();
  if (now - lastWifiTryAt >= WIFI_RETRY_MS) {
    lastWifiTryAt = now;
    Serial.println("[WiFi] สัญญาณหลุด กำลังเชื่อมต่อใหม่...");
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
}

bool postAndGetCommand() {
  if (WiFi.status() != WL_CONNECTED) return false;

  JsonDocument doc;
  doc["temperature"] = serialized(String(temperature, 1));
  doc["humidity"]    = serialized(String(humidity, 1));
  doc["water_level"] = waterOk;
  if (SOIL_ENABLED && !isnan(soilPct)) doc["soil_moisture"] = serialized(String(soilPct, 1));
  String body;
  serializeJson(doc, body);

  HTTPClient http;
  WiFiClientSecure secure;
  WiFiClient plain;
  bool isHttps = String(API_ENDPOINT_URL).startsWith("https://");
  bool began;
  if (isHttps) {
    secure.setInsecure();
    began = http.begin(secure, API_ENDPOINT_URL);
  } else {
    began = http.begin(plain, API_ENDPOINT_URL);
  }
  if (!began) {
    Serial.println("[HTTP] begin ล้มเหลว (ตรวจ URL)");
    return false;
  }
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/json");
  if (API_KEY[0] != '\0') http.addHeader("x-api-key", API_KEY);

  Serial.printf("[HTTP] POST %s\n[HTTP] body: %s\n", API_ENDPOINT_URL, body.c_str());
  int code = http.POST(body);
  if (code <= 0) {
    Serial.printf("[HTTP] error: %s (%d)\n", http.errorToString(code).c_str(), code);
    http.end();
    return false;
  }
  String resp = http.getString();
  http.end();
  Serial.printf("[HTTP] status=%d resp=%s\n", code, resp.c_str());
  if (code < 200 || code >= 300) return false;

  JsonDocument rd;
  if (deserializeJson(rd, resp) || !rd["pump_status"].is<bool>()) {
    Serial.println("[HTTP] response ไม่ใช่ JSON ที่มี pump_status (bool)");
    return false;
  }
  setPump(rd["pump_status"].as<bool>());
  return true;
}

void setup() {

  writeRelay(false);
  pinMode(PIN_RELAY, OUTPUT);
  writeRelay(false);

  pinMode(PIN_FLOAT, INPUT_PULLUP);
  if (PIN_SOIL_POWER >= 0) { pinMode(PIN_SOIL_POWER, OUTPUT); digitalWrite(PIN_SOIL_POWER, LOW); }
  analogSetPinAttenuation(PIN_SOIL, ADC_11db);

  Serial.begin(115200);
  delay(300);
  Serial.println("\n=== HydroSense boot ===");

  Wire.begin(PIN_SDA, PIN_SCL);
  lcd.init();
  lcd.backlight();
  lcd.createChar(1, degreeChar);
  lcdMessage("HydroSense", "Starting...");

  dht.begin();

  floatRaw = readWaterRaw();
  waterOk = floatRaw;
  Serial.printf("[WATER] เริ่มต้น: %s\n", waterOk ? "OK" : "LOW");

  connectWiFi();
  lastSendAt = millis() - INTERVAL_MS;
  readDHT();
  readSoil();
  updateLCD();
}

void loop() {
  updateWater();
  ensureWiFi();

  unsigned long now = millis();
  if (now - lastSendAt >= INTERVAL_MS) {
    lastSendAt = now;
    readSoil();
    if (readDHT()) {
      if (postAndGetCommand()) {
        lastServerOkAt = now;
        everServerOk = true;
      }
    }
  }

  if (pumpOn) {
    unsigned long ref = everServerOk ? lastServerOkAt : 0;
    if (now - ref > FAILSAFE_TIMEOUT_MS) {
      Serial.println("[PUMP] ไม่ได้รับคำตอบจากเซิร์ฟเวอร์นาน -> ปิดปั๊ม (fail-safe)");
      setPump(false);
    }
  }

  static unsigned long lastLcd = 0;
  if (now - lastLcd >= 500) {
    lastLcd = now;
    updateLCD();
  }
}
