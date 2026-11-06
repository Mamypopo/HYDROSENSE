import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// หน้าตรวจระบบชั่วคราว: บอกว่า env และตารางพร้อมไหม โดยไม่เปิดเผยค่าลับ
// ตรวจเสร็จแล้วลบไฟล์นี้ทิ้งได้
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  let host = '';
  let path = '';
  try { const u = new URL(url); host = u.host; path = u.pathname; } catch { host = '(URL ไม่ถูกรูปแบบหรือไม่ได้ตั้ง)'; }

  const s = await supabaseAdmin.from('pump_settings').select('id').eq('id', 1).maybeSingle();
  const r = await supabaseAdmin.from('sensor_readings').select('id').limit(1);

  const err = (e: { message: string; code?: string; hint?: string } | null) =>
    e ? { message: e.message, code: e.code, hint: e.hint } : null;

  return NextResponse.json({
    env: {
      urlHost: host,
      urlPathOk: path === '/' || path === '',      // ต้องไม่มี /rest/v1
      urlHasSpace: url !== url.trim(),
      keySet: key.length > 0,
      keyPrefix: key.slice(0, 10),                  // ควรเป็น sb_secret_ หรือ eyJ
      keyLength: key.length,
      keyHasSpace: key !== key.trim(),
    },
    pump_settings: { rowFound: !!s.data, error: err(s.error) },
    sensor_readings: { ok: !r.error, error: err(r.error) },
  });
}
