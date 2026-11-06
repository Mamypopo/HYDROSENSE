// กติกาสั่งปั๊มที่เดียว ใช้ร่วมกันทั้ง API (route.ts) และ Dashboard
// ถ้าจะแก้กติกา แก้ที่ไฟล์นี้ไฟล์เดียว

export type PumpSettings = {
  mode: 'auto' | 'manual';
  manual_pump: boolean;
  temp_threshold: number;
  cycle_on_min: number;
  cycle_off_min: number;
  cycle_anchor: string;
};

export type Why = 'dry' | 'manual' | 'hot' | 'cycle';

export type Decision = {
  on: boolean;
  why: Why;
  /** เฉพาะ why = 'cycle': เวลาที่เหลือก่อนสลับ (ms) ถ้า 0 แปลว่าไม่มีช่วงพัก */
  remainMs?: number;
  elapsedMs?: number;
  periodMs?: number;
};

export function decidePump(
  s: PumpSettings,
  r: { temperature: number; water_level: boolean },
  now: number = Date.now()
): Decision {
  // 1) Safety Rule: น้ำแห้ง = ปิดเสมอ
  if (!r.water_level) return { on: false, why: 'dry' };

  // 2) Manual: ตามที่ผู้ใช้กด
  if (s.mode === 'manual') return { on: s.manual_pump, why: 'manual' };

  // 3) Auto: ร้อนเกินเกณฑ์ = เปิด
  if (r.temperature > Number(s.temp_threshold)) return { on: true, why: 'hot' };

  // 4) Auto: อุณหภูมิปกติ = สลับเปิด/พักตามรอบ
  const onMs = s.cycle_on_min * 60_000;
  const offMs = s.cycle_off_min * 60_000;
  const periodMs = onMs + offMs;
  if (offMs === 0) return { on: true, why: 'cycle', remainMs: 0, elapsedMs: 0, periodMs };

  const elapsedMs =
    (((now - new Date(s.cycle_anchor).getTime()) % periodMs) + periodMs) % periodMs;
  return elapsedMs < onMs
    ? { on: true, why: 'cycle', remainMs: onMs - elapsedMs, elapsedMs, periodMs }
    : { on: false, why: 'cycle', remainMs: periodMs - elapsedMs, elapsedMs, periodMs };
}
