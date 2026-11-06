# HydroSense — ขั้นตอนติดตั้งและทดสอบ

## 1. ติดตั้ง ESP32 Board Manager ใน Arduino IDE
1. ติดตั้ง Arduino IDE 2.x จาก arduino.cc
2. เมนู **File > Preferences** ช่อง *Additional boards manager URLs* ใส่
   `https://espressif.github.io/arduino-esp32/package_esp32_index.json`
3. เมนู **Tools > Board > Boards Manager** ค้นหา `esp32` ติดตั้ง **"esp32 by Espressif Systems"**
4. เลือก **Tools > Board > esp32 > ESP32 Dev Module**
5. ต่อสาย Micro-USB แล้วเลือก **Tools > Port > COMx**
   - ถ้าไม่เจอพอร์ต ติดตั้งไดรเวอร์ CP210x หรือ CH340 (ดูชื่อชิป USB บนบอร์ด)
   - ถ้าอัปโหลดค้างที่ `Connecting....` ให้กดปุ่ม **BOOT** ค้างไว้จนเริ่มอัปโหลด

## 2. ติดตั้ง Library (Sketch > Include Library > Manage Libraries)
| ชื่อที่ค้นหา | ผู้พัฒนา |
|---|---|
| DHT sensor library | Adafruit |
| Adafruit Unified Sensor | Adafruit |
| LiquidCrystal I2C | Frank de Brabander |
| ArduinoJson | Benoit Blanchon (v7.x) |

## 3. ตั้งค่าและอัปโหลด
เปิด `HydroSense/HydroSense.ino` แก้ส่วน CONFIG บนสุด:
- `WIFI_SSID`, `WIFI_PASSWORD` (ESP32 ใช้ได้เฉพาะ Wi-Fi 2.4GHz)
- `API_ENDPOINT_URL` เช่น `http://192.168.1.100:3000/api/hydrosense` (ใช้ IP เครื่องเซิร์ฟเวอร์ **ห้ามใช้ localhost**)

กด Upload

## 4. Serial Monitor
เมนู **Tools > Serial Monitor** ตั้ง **115200 baud** ตัวอย่าง Log:
```
=== HydroSense boot ===
[WATER] เริ่มต้น: OK
[WiFi] เชื่อมต่อแล้ว IP=192.168.1.55 RSSI=-60
[HTTP] POST http://192.168.1.100:3000/api/hydrosense
[HTTP] body: {"temperature":28.5,"humidity":75.0,"water_level":true}
[HTTP] status=200 resp={"pump_status":true}
[PUMP] ON
```

| อาการ | สาเหตุ/วิธีแก้ |
|---|---|
| ตัวอักษรเพี้ยน | ตั้ง Serial Monitor เป็น 115200 |
| `[DHT] อ่านค่าไม่สำเร็จ` | เช็ก DATA→GPIO4, ไฟ 3.3V, ตัวต้านทาน 10kΩ (ถ้าเซนเซอร์เปล่า) |
| จอ LCD ไม่มีตัวอักษร | ปรับสกรูคอนทราสต์, ลอง `LCD_ADDR = 0x3F`, เช็ก SDA/SCL ไม่สลับ |
| Relay ทำงานกลับด้าน | สลับ `RELAY_ACTIVE_LOW` |
| `W:` สลับกับความจริง | สลับ `FLOAT_CLOSED_MEANS_WATER_OK` |
| `[HTTP] error: connection refused (-1)` | IP/Port ผิด, Firewall ของเซิร์ฟเวอร์ปิดกั้น, ไม่ได้อยู่ Wi-Fi วงเดียวกัน |

## 5. API Contract (สำหรับฝั่ง Web)
**Request** `POST {API_ENDPOINT_URL}` `Content-Type: application/json` (ทุก 5 วินาที)
```json
{ "temperature": 28.5, "humidity": 75.0, "water_level": true }
```
- `water_level`: `true` = น้ำปกติ, `false` = น้ำหมด

**Response** `200 OK`
```json
{ "pump_status": true }
```
- `true` = สั่งเปิดปั๊ม, `false` = ปิด
- ถ้า `water_level` เป็น `false` อุปกรณ์จะปฏิเสธคำสั่งเปิดเอง
- ถ้าอุปกรณ์ไม่ได้รับคำตอบที่ใช้ได้เกิน 30 วินาที จะปิดปั๊มเอง (fail-safe)
- ถ้าไม่มีการ POST เข้ามา แปลว่าอ่าน DHT22 ไม่ได้ (อุปกรณ์จะข้ามรอบนั้น)

## 6. Mock Server สำหรับทดสอบ (Node.js + Express)
```js
// mock.js — npm i express && node mock.js
const express = require('express');
const app = express();
app.use(express.json());
app.post('/api/hydrosense', (req, res) => {
  console.log(req.body);
  res.json({ pump_status: true });   // เปลี่ยนเป็น false เพื่อทดสอบปิดปั๊ม
});
app.listen(3000, '0.0.0.0');
```
หา IP ของ PC ด้วย `ipconfig` (IPv4 Address) และอนุญาต Port 3000 ใน Windows Firewall

## 7. ลำดับการทดสอบ (ทีละขั้น ยังไม่ต่อปั๊ม)
1. **LCD + Serial:** จอขึ้น "HydroSense / Starting..." แล้วขึ้นค่า
2. **DHT22:** เอามือกุมเซนเซอร์ อุณหภูมิ/ความชื้นต้องเปลี่ยน
3. **ลูกลอย:** ยก/จุ่มน้ำ จอสลับ `W:OK` / `W:LOW` ถูกต้อง
4. **Relay (ไม่ต่อปั๊ม):** รัน Mock Server ที่ตอบ `true` ขณะน้ำปกติ Relay ต้องคลิกและจอขึ้น `Pump:ON`
5. **Dry-run:** ขณะ Pump:ON ยกลูกลอยพ้นน้ำ Relay ต้องดับทันทีและขึ้น `Pump:OFF` แม้เซิร์ฟเวอร์ยังสั่ง `true`
6. **Wi-Fi Reconnect:** ปิด Wi-Fi Router สักครู่แล้วเปิดใหม่ อุปกรณ์ต้องต่อกลับเอง
7. ผ่านครบแล้วจึงต่อปั๊มตามหัวข้อ 3 ของ WIRING.md และทดสอบในภาชนะที่มีน้ำ
