import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Dashboard ส่ง PATCH มาแก้ค่าตั้ง รับเฉพาะ field ที่อนุญาต และตรวจช่วงค่าก่อนเขียน
export async function PATCH(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if ('mode' in b) {
    if (b.mode !== 'auto' && b.mode !== 'manual') return bad('mode');
    patch.mode = b.mode;
  }
  if ('manual_pump' in b) {
    if (typeof b.manual_pump !== 'boolean') return bad('manual_pump');
    patch.manual_pump = b.manual_pump;
  }
  if ('temp_threshold' in b) {
    const v = b.temp_threshold;
    if (typeof v !== 'number' || !(v >= 20 && v <= 45)) return bad('temp_threshold');
    patch.temp_threshold = v;
  }
  if ('cycle_on_min' in b) {
    const v = b.cycle_on_min;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 240) return bad('cycle_on_min');
    patch.cycle_on_min = v;
  }
  if ('cycle_off_min' in b) {
    const v = b.cycle_off_min;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 240) return bad('cycle_off_min');
    patch.cycle_off_min = v;
  }
  if ('auto_strategy' in b) {
    if (b.auto_strategy !== 'temp' && b.auto_strategy !== 'soil') return bad('auto_strategy');
    patch.auto_strategy = b.auto_strategy;
  }
  for (const k of ['soil_start_pct', 'soil_stop_pct'] as const) {
    if (k in b) {
      const v = b[k];
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 5 || v > 95) return bad(k);
      patch[k] = v;
    }
  }
  // ค่าเริ่มรดต้องต่ำกว่าค่าหยุดรดอย่างน้อย 5 (ไม่งั้นปั๊มจะเปิดปิดถี่) — ถ้าส่งมาแค่ตัวเดียว เทียบกับค่าเดิมในฐานข้อมูล
  if ('soil_start_pct' in patch || 'soil_stop_pct' in patch) {
    let start = patch.soil_start_pct as number | undefined;
    let stop = patch.soil_stop_pct as number | undefined;
    if (start === undefined || stop === undefined) {
      const { data: cur } = await supabaseAdmin
        .from('pump_settings').select('soil_start_pct, soil_stop_pct').eq('id', 1).single();
      start ??= cur?.soil_start_pct;
      stop ??= cur?.soil_stop_pct;
    }
    if (typeof start !== 'number' || typeof stop !== 'number' || stop - start < 5) {
      return NextResponse.json({ error: 'soil_stop_pct must be at least 5 higher than soil_start_pct' }, { status: 400 });
    }
  }
  if (b.reset_cycle === true) patch.cycle_anchor = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('pump_settings')
    .update(patch)
    .eq('id', 1)
    .select()
    .single();

  if (error || !data) {
    console.error('[settings] update failed:', error);
    return NextResponse.json({ error: 'update failed' }, { status: 500 });
  }
  return NextResponse.json({ settings: data });
}

function bad(field: string) {
  return NextResponse.json({ error: `invalid ${field}` }, { status: 400 });
}
