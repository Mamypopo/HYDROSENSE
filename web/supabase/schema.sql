-- HydroSense — รันทั้งไฟล์ใน Supabase > SQL Editor

-- 1) ค่าตั้งระบบ (มีแถวเดียว id = 1)
create table if not exists public.pump_settings (
  id              int primary key default 1 check (id = 1),
  mode            text    not null default 'auto' check (mode in ('auto', 'manual')),
  manual_pump     boolean not null default false,          -- ค่าที่ผู้ใช้กดจาก Dashboard (ใช้ตอน manual)
  temp_threshold  numeric not null default 32,              -- อุณหภูมิสูงกว่านี้ = ปั๊มทำงาน (auto)
  cycle_on_min    int     not null default 15 check (cycle_on_min  > 0),  -- นาทีที่เปิด
  cycle_off_min   int     not null default 15 check (cycle_off_min >= 0), -- นาทีที่พัก
  cycle_anchor    timestamptz not null default now(),       -- จุดเริ่มนับรอบ (เปลี่ยนเพื่อรีเซ็ตรอบ)
  updated_at      timestamptz not null default now()
);

insert into public.pump_settings (id) values (1) on conflict (id) do nothing;

-- 2) ประวัติค่าที่ ESP32 ส่งมา
create table if not exists public.sensor_readings (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  temperature  numeric not null,
  humidity     numeric not null,
  water_level  boolean not null,   -- true = น้ำปกติ, false = น้ำแห้ง
  pump_status  boolean not null    -- ค่าที่เซิร์ฟเวอร์สั่งกลับไป
);

create index if not exists sensor_readings_created_at_idx
  on public.sensor_readings (created_at desc);

-- 3) Row Level Security: เปิดไว้และไม่สร้าง policy ให้ anon/authenticated
-- ผลคือเข้าตารางจากเบราว์เซอร์โดยตรงไม่ได้ ทุกอย่างผ่าน API routes ที่ใช้ service_role (ข้าม RLS)
alter table public.pump_settings   enable row level security;
alter table public.sensor_readings enable row level security;

-- 4) (ทางเลือก) ลบข้อมูลเก่ากว่า 30 วัน — ส่งทุก 5 วินาที ≈ 17,000 แถว/วัน
-- select cron.schedule('purge-readings', '0 3 * * *',
--   $$ delete from public.sensor_readings where created_at < now() - interval '30 days' $$);
