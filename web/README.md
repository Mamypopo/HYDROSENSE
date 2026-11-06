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

## ข้อควรรู้
- **ไม่มีล็อกอิน = ใครรู้ URL ก็เปิดและสั่งปั๊มได้** ถ้าใช้จริงบนอินเทอร์เน็ต ควรเพิ่มอย่างน้อยรหัส PIN หรือ Vercel Password Protection ภายหลัง
- ฐานข้อมูลปิดสนิทจากเบราว์เซอร์ (RLS ไม่มี policy) Dashboard ทุกอย่างผ่าน API routes
- Dashboard ใช้การดึงข้อมูลซ้ำทุก 3 วินาที (ไม่ใช่ Realtime) พอสำหรับอุปกรณ์ที่ส่งทุก 5 วินาที
- ถ้า Deploy บน Vercel ตั้ง Function Region เป็น Singapore (sin1) ให้ใกล้ฐานข้อมูล
- Dashboard ขึ้น "ออฟไลน์" เมื่อไม่มีข้อมูลใหม่เกิน 20 วินาที
- ตารางโตเร็ว (ประมาณ 17,000 แถวต่อวัน) ควรตั้งลบข้อมูลเก่า ดูท้ายไฟล์ `schema.sql`

## ภาพพื้นหลัง
หน้าแรกใช้ภาพถ่ายเป็นฮีโร่ ให้ถ่ายรูปโรงเรือนจริง (แนวตั้ง ความกว้างอย่างน้อย 1200px) แล้ววางที่ `web/public/greenhouse.jpg` ถ้ายังไม่มีไฟล์ จะแสดงพื้นหลังไล่สีเขียวสำรองแทน ใช้ภาพที่ตัวเองถ่ายหรือมีลิขสิทธิ์ใช้ได้เท่านั้น ควรบีบไฟล์ให้ไม่เกิน 300KB
