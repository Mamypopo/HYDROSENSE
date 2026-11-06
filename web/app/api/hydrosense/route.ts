import { NextResponse } from 'next/server';
import { decidePump, type PumpSettings } from '@/lib/pump';
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

  const { temperature, humidity, water_level } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof temperature !== 'number' || !Number.isFinite(temperature) ||
    typeof humidity !== 'number' || !Number.isFinite(humidity) ||
    typeof water_level !== 'boolean'
  ) {
    return NextResponse.json(
      { error: 'expected {temperature:number, humidity:number, water_level:boolean}' },
      { status: 400 }
    );
  }

  // Safety Rule: น้ำแห้ง = ปิดปั๊มเสมอ โดยไม่ต้องรอฐานข้อมูล
  let pump_status = false;

  if (water_level) {
    const { data: settings, error } = await supabase
      .from('pump_settings')
      .select('*')
      .eq('id', 1)
      .single<PumpSettings>();

    if (error || !settings) {
      console.error('[hydrosense] load settings failed:', error);
      // ตอบ 500 ให้ ESP32 คงสถานะเดิม (และ fail-safe ปิดปั๊มเองภายใน 30 วินาที)
      return NextResponse.json({ error: 'settings unavailable' }, { status: 500 });
    }

    pump_status = decidePump(settings, { temperature, water_level }).on;
  }

  // บันทึกประวัติ — ถ้าบันทึกพลาดก็ยังตอบคำสั่งปั๊มตามปกติ
  const { error: insertError } = await supabase.from('sensor_readings').insert({
    temperature,
    humidity,
    water_level,
    pump_status,
  });
  if (insertError) console.error('[hydrosense] insert failed:', insertError);

  return NextResponse.json({ pump_status });
}
