// กติกาสั่งปั๊มที่เดียว ใช้ร่วมกันทั้ง API (route.ts) และ Dashboard
// ถ้าจะแก้กติกา แก้ที่ไฟล์นี้ไฟล์เดียว

export type PumpSettings = {
  mode: 'auto' | 'manual';
  manual_pump: boolean;
  temp_threshold: number;
  cycle_on_min: number;
  cycle_off_min: number;
  cycle_anchor: string;
  /** โหมดอัตโนมัติ: 'temp' = ตามอุณหภูมิและรอบเวลา, 'soil' = ตามความชื้นดิน */
  auto_strategy: 'temp' | 'soil';
  /** ดินแห้งถึงค่านี้หรือต่ำกว่า = เริ่มรด (%) */
  soil_start_pct: number;
  /** ดินชื้นถึงค่านี้ = หยุดรด (%) */
  soil_stop_pct: number;
  /** สถานะ "กำลังรดอยู่" ที่จำไว้ระหว่างค่า start กับ stop (ให้ปั๊มไม่เปิดปิดถี่) */
  soil_watering: boolean;
};

export type Why = 'dry' | 'manual' | 'hot' | 'cycle' | 'soil';

export type Decision = {
  on: boolean;
  why: Why;
  /** เฉพาะ why = 'cycle': เวลาที่เหลือก่อนสลับ (ms) ถ้า 0 แปลว่าไม่มีช่วงพัก */
  remainMs?: number;
  elapsedMs?: number;
  periodMs?: number;
  /** เฉพาะ why = 'soil': สถานะรดน้ำใหม่ที่ต้องจำ (route.ts จะบันทึกลงฐานข้อมูล) */
  watering?: boolean;
  /** เลือกโหมดตามดินไว้ แต่ไม่มีค่าดิน จึงใช้กฎอุณหภูมิ/รอบเวลาแทน */
  fallback?: boolean;
};

export type PumpInput = {
  temperature: number;
  water_level: boolean;
  /** ความชื้นดิน 0-100 (null/undefined = ไม่มีเซนเซอร์หรืออ่านไม่ได้) */
  soil_moisture?: number | null;
};

export function decidePump(s: PumpSettings, r: PumpInput, now: number = Date.now()): Decision {
  // 1) Safety Rule: น้ำแห้ง = ปิดเสมอ
  if (!r.water_level) return { on: false, why: 'dry' };

  // 2) Manual: ตามที่ผู้ใช้กด
  if (s.mode === 'manual') return { on: s.manual_pump, why: 'manual' };

  // 3) Auto แบบตามดิน: ต่ำกว่า start = เริ่มรด, ถึง stop = หยุด, ระหว่างกลางคงสถานะเดิม
  const wantSoil = s.auto_strategy === 'soil';
  if (wantSoil && r.soil_moisture != null) {
    let watering = Boolean(s.soil_watering);
    if (r.soil_moisture <= Number(s.soil_start_pct)) watering = true;
    else if (r.soil_moisture >= Number(s.soil_stop_pct)) watering = false;
    return { on: watering, why: 'soil', watering };
  }

  // 4) Auto แบบอุณหภูมิ/รอบเวลา (ใช้เป็นตัวสำรองด้วย ถ้าเลือกตามดินแต่ไม่มีค่าดิน)
  const d = decideByTemp(s, r, now);
  return wantSoil ? { ...d, fallback: true } : d;
}

function decideByTemp(s: PumpSettings, r: PumpInput, now: number): Decision {
  // ร้อนเกินเกณฑ์ = เปิด
  if (r.temperature > Number(s.temp_threshold)) return { on: true, why: 'hot' };

  // อุณหภูมิปกติ = สลับเปิด/พักตามรอบ
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
