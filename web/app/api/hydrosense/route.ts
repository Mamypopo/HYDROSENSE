import { NextResponse, after } from 'next/server';
import { decidePump, type PumpSettings } from '@/lib/pump';
import { lineEnabled, sendLine } from '@/lib/line';
import { buildAlerts, LOOKBACK, type PastReading } from '@/lib/alerts';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // (ทางเลือก) ตรวจ API key ถ้าตั้ง HYDROSENSE_API_KEY ไว้ — ESP32 ส่งใน header x-api-key
  const apiKey = process.env.HYDROSENSE_API_KEY;
  if (apiKey && req.headers.get('x-api-key') !== apiKey) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { temperature, humidity, water_level, soil_moisture: soilRaw } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof temperature !== 'number' || !Number.isFinite(temperature) ||
    typeof humidity !== 'number' || !Number.isFinite(humidity) ||
    typeof water_level !== 'boolean'
  ) {
    return NextResponse.json(
      { error: 'expected {temperature:number, humidity:number, water_level:boolean, soil_moisture?:number}' },
      { status: 400 }
    );
  }
  // soil_moisture เป็นค่าเสริม (0-100) ไม่ส่งมา/เป็น null = ไม่มีเซนเซอร์ดิน
  let soil_moisture: number | null = null;
  if (soilRaw !== undefined && soilRaw !== null) {
    if (typeof soilRaw !== 'number' || !Number.isFinite(soilRaw) || soilRaw < 0 || soilRaw > 100) {
      return NextResponse.json({ error: 'soil_moisture must be a number 0-100' }, { status: 400 });
    }
    soil_moisture = soilRaw;
  }

  // Safety Rule: น้ำแห้ง = ปิดปั๊มเสมอ โดยไม่ต้องรอฐานข้อมูล
  let pump_status = false;
  let settings: PumpSettings | null = null;

  if (water_level) {
    const { data, error } = await supabase
      .from('pump_settings')
      .select('*')
      .eq('id', 1)
      .single<PumpSettings>();

    if (error || !data) {
      console.error('[hydrosense] load settings failed:', error);
      // ตอบ 500 ให้ ESP32 คงสถานะเดิม (และ fail-safe ปิดปั๊มเองภายใน 30 วินาที)
      return NextResponse.json({ error: 'settings unavailable' }, { status: 500 });
    }
    settings = data;

    const d = decidePump(settings, { temperature, water_level, soil_moisture });
    pump_status = d.on;

    // โหมดตามดิน: จำสถานะ "กำลังรดอยู่" ไว้ข้ามรอบ (ให้ปั๊มเปิดค้างจนดินถึงค่าหยุด)
    if (d.why === 'soil' && d.watering !== Boolean(settings.soil_watering)) {
      const { error: stateError } = await supabase
        .from('pump_settings')
        .update({ soil_watering: d.watering })
        .eq('id', 1);
      if (stateError) console.error('[hydrosense] save soil_watering failed:', stateError);
    }
  }

  // แจ้งเตือน LINE (น้ำหมด/น้ำกลับมา/ร้อนเกิน/ดินแห้ง) กติกาอยู่ใน lib/alerts.ts
  // ส่งหลังตอบ ESP32 แล้ว (after) ไม่ทำให้ช้า และถ้าพลาดก็ไม่กระทบการสั่งปั๊ม
  if (lineEnabled()) {
    try {
      if (!settings) {
        // น้ำแห้งไม่ได้โหลดค่าตั้งไว้ข้างบน โหลดเพิ่มเฉพาะเพื่อแจ้งเตือน (พลาดก็ข้าม)
        const { data } = await supabase.from('pump_settings').select('*').eq('id', 1).single<PumpSettings>();
        settings = data ?? null;
      }
      const { data: prev } = await supabase
        .from('sensor_readings')
        .select('water_level, temperature, soil_moisture')
        .order('created_at', { ascending: false })
        .limit(LOOKBACK);
      const msgs = buildAlerts({ temperature, water_level, soil_moisture }, (prev ?? []) as PastReading[], settings);
      for (const m of msgs) after(() => sendLine(m));
    } catch (e) {
      console.error('[hydrosense] alert check failed:', e);
    }
  }

  // บันทึกประวัติ — ถ้าบันทึกพลาดก็ยังตอบคำสั่งปั๊มตามปกติ
  const { error: insertError } = await supabase.from('sensor_readings').insert({
    temperature,
    humidity,
    water_level,
    pump_status,
    soil_moisture,
  });
  if (insertError) console.error('[hydrosense] insert failed:', insertError);

  return NextResponse.json({ pump_status });
}
