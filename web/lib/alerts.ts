// กติกาแจ้งเตือน LINE: คืนข้อความที่ควรส่ง (ว่าง = ไม่ต้องส่ง) แยกจาก route.ts เพื่อให้ทดสอบง่าย
// หลักการ: เตือนเฉพาะ "ตอนเริ่มเกิดเหตุ" ถ้าอยู่ในสภาพเดิมต่อเนื่อง จะไม่เตือนซ้ำ

import type { PumpSettings } from './pump';

export type PastReading = {
  water_level: boolean;
  temperature: number;
  soil_moisture: number | null;
};

export type Current = {
  temperature: number;
  water_level: boolean;
  soil_moisture: number | null;
};

/** จำนวนค่าย้อนหลังที่ใช้กันเตือนซ้ำ (ส่งทุก 5 วินาที ≈ 5 นาที) */
export const LOOKBACK = 60;

/**
 * prev = ค่าก่อนหน้า เรียงจากใหม่ไปเก่า (ไม่รวมค่ารอบนี้)
 * settings = ค่าตั้ง (null ถ้าโหลดไม่ได้)
 */
export function buildAlerts(cur: Current, prev: PastReading[], settings: PumpSettings | null): string[] {
  const out: string[] = [];
  if (prev.length === 0) return out; // ยังไม่มีประวัติ ไม่รู้ว่าเพิ่งเปลี่ยนหรือเปล่า

  // --- น้ำหมด / น้ำกลับมา ---
  // กันลูกลอยกระเพื่อมรอบเดียว: เตือนน้ำหมดเมื่อแห้งติดกัน 2 รอบ, เตือนน้ำกลับมาเมื่อปกติติดกัน 2 รอบหลังแห้ง >= 2 รอบ
  const [p0, p1, p2] = prev;
  if (!cur.water_level && p0.water_level === false && p1?.water_level === true) {
    out.push(`🚨 HydroSense: น้ำในถังหมดแล้ว\nระบบปิดปั๊มให้อัตโนมัติ กรุณาเติมน้ำ\n(อุณหภูมิตอนนี้ ${cur.temperature.toFixed(1)}°C)`);
  } else if (cur.water_level && p0.water_level === true && p1?.water_level === false && p2?.water_level === false) {
    out.push('✅ HydroSense: น้ำกลับมาแล้ว ปั๊มกลับมาทำงานตามปกติได้');
  }

  if (!settings) return out;

  // --- อากาศร้อนเกินเกณฑ์: เตือนครั้งเดียวตอนเริ่มร้อน (ถ้า 5 นาทีก่อนหน้าไม่ร้อนเลย) ---
  const th = Number(settings.temp_threshold);
  if (cur.temperature > th && prev.every((r) => !(r.temperature > th))) {
    out.push(`🌡️ HydroSense: อากาศร้อนเกินเกณฑ์แล้ว\nตอนนี้ ${cur.temperature.toFixed(1)}°C (เกณฑ์ ${th}°C)${hotNote(cur, settings)}`);
  }

  // --- ดินแห้ง: เตือนครั้งเดียวตอนเริ่มแห้ง (ถ้า 5 นาทีก่อนหน้าไม่แห้งเลย) ---
  const start = Number(settings.soil_start_pct);
  const soil = cur.soil_moisture;
  if (soil !== null && soil <= start && prev.every((r) => r.soil_moisture === null || !(Number(r.soil_moisture) <= start))) {
    out.push(`🌱 HydroSense: ดินแห้งแล้ว (${Math.round(soil)}%)${soilNote(cur, settings)}`);
  }

  return out;
}

function hotNote(cur: Current, s: PumpSettings): string {
  if (!cur.water_level) return '\nแต่น้ำในถังหมด ปั๊มจึงปิดอยู่';
  if (s.mode === 'auto' && s.auto_strategy !== 'soil') return '\nปั๊มกำลังรดน้ำต่อเนื่องให้';
  return '';
}

function soilNote(cur: Current, s: PumpSettings): string {
  if (!cur.water_level) return '\nแต่น้ำในถังหมด ปั๊มรดไม่ได้ กรุณาเติมน้ำ';
  if (s.mode === 'auto' && s.auto_strategy === 'soil') return '\nปั๊มกำลังรดให้อัตโนมัติ';
  return '\nตอนนี้ปั๊มไม่ได้รดตามดิน (ตั้งไว้โหมดอื่น)';
}
