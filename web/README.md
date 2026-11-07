# HydroSense Web (Next.js App Router + Supabase)

ไฟล์ในโฟลเดอร์นี้คัดลอกไปวางในโปรเจกต์ Next.js ของคุณ โดยคงโครงสร้างโฟลเดอร์เดิม ไม่มีระบบล็อกอิน

| ไฟล์ | หน้าที่ |
|---|---|
| `supabase/schema.sql` | สร้างตารางและเปิด RLS (รันใน Supabase SQL Editor) |
| `lib/pump.ts` | **กติกาสั่งปั๊มที่เดียว** ใช้ทั้ง API และ Dashboard |
| `lib/supabaseAdmin.ts`, `lib/types.ts` | Supabase client ฝั่งเซิร์ฟเวอร์ และ type |
| `app/api/hydrosense/route.ts` | ESP32 POST เข้ามาที่นี่ บันทึกข้อมูล และตอบ `{ pump_status }` |
| `app/api/dashboard/route.ts` | Dashboard ดึงค่าตั้งและค่าล่าสุด 60 ครั้ง (GET) |
| `app/api/settings/route.ts` | Dashboard แก้โหมดและค่าตั้ง (PATCH) พร้อมตรวจช่วงค่า |
| `app/page.tsx`, `components/*` | หน้า Dashboard (มือถือเป็นหลัก) ภาพฮีโร่อยู่ใน `Hero.tsx` |
| `public/greenhouse.jpg` | **ภาพถ่ายโรงเรือนของคุณเอง** (ดูหัวข้อ "ภาพพื้นหลัง") |
| `app/layout.tsx`, `app/hydrosense.css` | ฟอนต์ ธีมสว่าง/มืด และคลาสช่วย |
| `mockup/dashboard.html` | ตัวอย่างดีไซน์ HTML เดี่ยว (ลบได้) |

## ขั้นตอนติดตั้ง
1. สร้างโปรเจกต์ Supabase เลือก Region **Southeast Asia (Singapore)** ใกล้ประเทศไทยที่สุด
2. Supabase > **SQL Editor** > New query > วางเนื้อหา `supabase/schema.sql` ทั้งไฟล์ > กด **Run** (ต้องขึ้น Success) แล้วเช็กที่ Table Editor ว่ามี `pump_settings` (1 แถว) และ `sensor_readings`
   - **อัปเดตเป็นเวอร์ชันที่มีเซนเซอร์ดิน:** รันไฟล์ `schema.sql` ซ้ำได้เลย (ใช้ `if not exists` ไม่ลบข้อมูลเดิม) มันจะเพิ่มคอลัมน์ `soil_moisture`, `auto_strategy`, `soil_start_pct`, `soil_stop_pct`, `soil_watering` **รันก่อน deploy โค้ดใหม่**
3. Supabase > **Project Settings > API** คัดลอก Project URL และ `service_role` key
4. คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่า
5. `npm i @supabase/supabase-js framer-motion lucide-react sweetalert2`
6. `app/layout.tsx` ในชุดนี้ใช้ฟอนต์ Anuphan กับ Bricolage Grotesque และ import `hydrosense.css` ถ้าโปรเจกต์คุณมี layout อยู่แล้ว ให้รวมเฉพาะส่วนฟอนต์ `className` ของ `<body>` และสคริปต์ธีม
7. ต้องมี alias `@/*` ใน `tsconfig.json` (create-next-app ตั้งไว้ให้แล้ว)
8. `npm run dev` แล้วเปิด http://localhost:3000

ถ้าขึ้น "โหลดข้อมูลไม่ได้" ให้เช็ก `.env.local` และดู Log ใน Terminal ของ `npm run dev`

## ทดสอบโดยยังไม่มีอุปกรณ์
```bash
curl -X POST http://localhost:3000/api/hydrosense \
  -H "Content-Type: application/json" \
  -d '{"temperature":29.5,"humidity":74,"water_level":true}'
```
ควรได้ `{"pump_status":...}` และ Dashboard อัปเดตภายใน 3 วินาที

| ทดสอบ | ส่งอะไร | ผลที่ถูกต้อง |
|---|---|---|
| น้ำแห้ง | `"water_level":false` | `{"pump_status":false}` เสมอ ไม่ว่าโหมดไหน |
| อัตโนมัติ + ร้อน | `"temperature":34` | `{"pump_status":true}` |
| อัตโนมัติ + ปกติ | `"temperature":29` | สลับตามรอบเวลา |
| สั่งเอง | กดปุ่มใน Dashboard แล้วส่งใหม่ | ตรงกับที่กด |

## แจ้งเตือน LINE (ทางเลือก)
LINE Notify ปิดบริการไปแล้ว ต้องใช้ **LINE Messaging API** (บอทส่งข้อความหาเรา) ระบบจะส่งข้อความเมื่อ:
- 🚨 **น้ำในถังหมด** (ลูกลอยบอกแห้งติดกัน 2 รอบ ≈ 10 วินาที)
- ✅ **น้ำกลับมาแล้ว**
- 🌡️ **อากาศร้อนเกินเกณฑ์** (เตือนครั้งเดียวตอนเริ่มร้อน ถ้าก่อนหน้านั้น 5 นาทีไม่ร้อนเกิน)
- 🌱 **ดินแห้ง** (ความชื้นดินลงถึงค่า "เริ่มรด" เตือนครั้งเดียวตอนเริ่มแห้ง ต้องมีเซนเซอร์ดิน)

กติกาอยู่ที่ `lib/alerts.ts` (ไฟล์เดียว) เตือนเฉพาะตอน "เริ่มเกิดเหตุ" อยู่ในสภาพเดิมต่อเนื่องไม่เตือนซ้ำ

ตั้งค่า:
1. เข้า https://developers.line.biz/console/ ล็อกอินด้วยบัญชี LINE > **Create a new provider** (ตั้งชื่ออะไรก็ได้)
2. ในโปรไวเดอร์ > **Create a Messaging API channel** กรอกข้อมูลตามหน้าจอ (ชื่อบอท เช่น HydroSense, หมวดหมู่ใดก็ได้)
3. เปิดแท็บ **Messaging API** > เลื่อนลงที่ **Channel access token (long-lived)** กด **Issue** แล้วคัดลอก (นี่คือ `LINE_CHANNEL_ACCESS_TOKEN` **เก็บเป็นความลับ**)
4. ที่แท็บเดิม สแกน **QR code** ด้วยมือถือเพื่อ **เพิ่มบอทเป็นเพื่อน** (ต้องทำ ไม่งั้นบอทส่งหาเราไม่ได้)
5. ใน Vercel > Settings > Environment Variables เพิ่ม `LINE_CHANNEL_ACCESS_TOKEN` (ชนิด **Config** เหมือนค่าอื่น) แล้ว **Redeploy**
   - **ไม่ต้องใส่ `LINE_TO`** ระบบจะส่งหา **ทุกคนที่เป็นเพื่อนกับบอท** (ใครสแกน QR เพิ่มบอทก็ได้ข้อความ)
   - ถ้าอยากส่งหาคนเดียว ให้ใส่ `LINE_TO` เป็น **Your user ID** (แท็บ Basic settings ขึ้นต้นด้วย `U`)

ทดสอบการตั้งค่า (แทน `TOKEN` ด้วยค่าจริง ทำในเครื่องตัวเอง อย่าแปะในแชท):
```bash
curl -X POST https://api.line.me/v2/bot/message/broadcast \
  -H "Content-Type: application/json" -H "Authorization: Bearer TOKEN" \
  -d '{"messages":[{"type":"text","text":"ทดสอบ HydroSense"}]}'
```
ข้อความต้องเด้งเข้า LINE ของทุกคนที่เป็นเพื่อนกับบอท ถ้าได้ `{}` แต่ไม่เห็นข้อความ ให้เช็กว่าเพิ่มบอทเป็นเพื่อนแล้ว

ข้อควรรู้เรื่อง LINE:
- แพ็กเกจฟรีจำกัดจำนวนข้อความต่อเดือน (ดูโควตาปัจจุบันที่ LINE Official Account Manager) ระบบส่งเฉพาะตอนสถานะน้ำเปลี่ยนจึงใช้น้อย
- **ยังไม่มีแจ้งเตือนอุปกรณ์ออฟไลน์** เพราะต้องมีตัวตั้งเวลาคอยเช็กอยู่ฝั่งเซิร์ฟเวอร์ (Vercel แพ็กเกจฟรีตั้ง cron ได้วันละครั้ง) ถ้าต้องการ เพิ่มภายหลังได้ด้วย Supabase pg_cron
- แบบส่งหา**ทุกคนที่เป็นเพื่อน** โควตาข้อความนับ **ตามจำนวนคนที่รับ** (1 ข้อความ x 5 เพื่อน = 5 ข้อความ) ยิ่งมีเพื่อนเยอะ โควตาฟรียิ่งหมดเร็ว
- **QR ของบอทเป็นเหมือนกุญแจ** ใครสแกนเพิ่มเป็นเพื่อนก็ได้ข้อความแจ้งเตือนของฟาร์ม ให้แจกเฉพาะคนที่ต้องการให้รู้ และถ้ามีคนที่ไม่ต้องการให้รับ ให้บล็อกหรือลบเพื่อนที่ LINE Official Account Manager
- ส่งเข้า**กลุ่ม**ได้ถ้าใส่ group ID ที่ `LINE_TO` แต่ต้องดึง ID จาก webhook ซึ่งยังไม่ได้ทำไว้

## ข้อควรรู้
- **ไม่มีล็อกอิน = ใครรู้ URL ก็เปิดและสั่งปั๊มได้** ถ้าใช้จริงบนอินเทอร์เน็ต ควรเพิ่มอย่างน้อยรหัส PIN หรือ Vercel Password Protection ภายหลัง
- ฐานข้อมูลปิดสนิทจากเบราว์เซอร์ (RLS ไม่มี policy) Dashboard ทุกอย่างผ่าน API routes
- Dashboard ใช้การดึงข้อมูลซ้ำทุก 3 วินาที (ไม่ใช่ Realtime) พอสำหรับอุปกรณ์ที่ส่งทุก 5 วินาที
- ถ้า Deploy บน Vercel ตั้ง Function Region เป็น Singapore (sin1) ให้ใกล้ฐานข้อมูล
- Dashboard ขึ้น "ออฟไลน์" เมื่อไม่มีข้อมูลใหม่เกิน 20 วินาที
- ตารางโตเร็ว (ประมาณ 17,000 แถวต่อวัน) ควรตั้งลบข้อมูลเก่า ดูท้ายไฟล์ `schema.sql`

## ภาพพื้นหลัง
หน้าแรกใช้ภาพถ่ายเป็นฮีโร่ ให้ถ่ายรูปโรงเรือนจริง (แนวตั้ง ความกว้างอย่างน้อย 1200px) แล้ววางที่ `web/public/greenhouse.jpg` ถ้ายังไม่มีไฟล์ จะแสดงพื้นหลังไล่สีเขียวสำรองแทน ใช้ภาพที่ตัวเองถ่ายหรือมีลิขสิทธิ์ใช้ได้เท่านั้น ควรบีบไฟล์ให้ไม่เกิน 300KB
