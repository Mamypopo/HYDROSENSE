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
