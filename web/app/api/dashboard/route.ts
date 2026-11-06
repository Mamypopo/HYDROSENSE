import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Dashboard เรียกทุก 3 วินาที: ค่าตั้ง + ค่าล่าสุด 60 ครั้ง (เรียงเก่า -> ใหม่)
export async function GET() {
  const [s, r] = await Promise.all([
    supabaseAdmin.from('pump_settings').select('*').eq('id', 1).single(),
    supabaseAdmin.from('sensor_readings').select('*').order('created_at', { ascending: false }).limit(60),
  ]);
  if (s.error || r.error) {
    console.error('[dashboard] load failed:', s.error ?? r.error);
    return NextResponse.json({ error: 'load failed' }, { status: 500 });
  }
  return NextResponse.json({ settings: s.data, readings: (r.data ?? []).reverse() });
}
