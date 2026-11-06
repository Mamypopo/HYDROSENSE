'use client';

import { useEffect, useState } from 'react';
import { Flame, RotateCcw, Save, Timer } from 'lucide-react';
import type { Decision, PumpSettings } from '@/lib/pump';
import Stepper from './Stepper';
import { mmss } from './ControlCard';

type Props = {
  settings: PumpSettings;
  decision: Decision | null;
  onSave: (v: { th: number; on: number; off: number }) => void;
};

// ค่าตั้งของโหมดอัตโนมัติ: ปรับด้วยปุ่ม − / + ปุ่มบันทึกจะโผล่เมื่อมีการแก้ค่า
export default function AutoSettings({ settings, decision, onSave }: Props) {
  const [th, setTh] = useState(Number(settings.temp_threshold));
  const [on, setOn] = useState(settings.cycle_on_min);
  const [off, setOff] = useState(settings.cycle_off_min);

  useEffect(() => {
    setTh(Number(settings.temp_threshold));
    setOn(settings.cycle_on_min);
    setOff(settings.cycle_off_min);
  }, [settings.temp_threshold, settings.cycle_on_min, settings.cycle_off_min]);

  const active = settings.mode === 'auto';
  const dirty = th !== Number(settings.temp_threshold) || on !== settings.cycle_on_min || off !== settings.cycle_off_min;

  // แถบรอบเวลา: ความกว้างตามค่าที่กำลังแก้ หัวชี้ตำแหน่งจริงเฉพาะตอนยังไม่แก้
  const onPct = (on / (on + off)) * 100;
  const cycleLive = active && decision?.why === 'cycle' && !dirty && decision.periodMs;
  const headPct = cycleLive ? ((decision!.elapsedMs ?? 0) / decision!.periodMs!) * 100 : null;

  const note = !decision ? 'รอข้อมูลจากอุปกรณ์'
    : decision.why === 'cycle' ? (decision.remainMs === 0 ? 'ไม่ได้ตั้งเวลาพัก ปั๊มเปิดตลอด' : `ตอนนี้${decision.on ? 'อยู่ช่วงเปิด' : 'อยู่ช่วงพัก'} อีก ${mmss(decision.remainMs ?? 0)} นาทีจะสลับ`)
    : decision.why === 'dry' ? 'รอบเวลาหยุดไว้ เพราะน้ำแห้ง'
    : decision.why === 'hot' ? 'รอบเวลาหยุดไว้ เพราะอากาศร้อนเกินเกณฑ์'
    : 'รอบเวลาใช้ตอนอยู่โหมดอัตโนมัติ';

  const dim = active ? '' : 'pointer-events-none opacity-45';

  return (
    <>
      <section aria-labelledby="heat-title" className={`hs-b hs-b-heat col-span-2 rounded-[28px] sm:col-span-1 ${dim}`}>
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5" />
          <h2 id="heat-title" className="hs-display text-lg font-medium">เมื่ออากาศร้อน</h2>
        </div>
        <p className="mb-4 mt-1 text-sm opacity-80">เกินกี่องศา ปั๊มถึงจะเปิดรดน้ำต่อเนื่อง</p>
        <Stepper label="อุณหภูมิ" value={th} onChange={setTh} min={20} max={45} step={0.5} decimals={1} unit="°C" />
      </section>

      <section aria-labelledby="time-title" className={`hs-b hs-b-time col-span-2 rounded-[28px] sm:col-span-1 ${dim}`}>
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5" />
          <h2 id="time-title" className="hs-display text-lg font-medium">รอบเปิดและพัก</h2>
        </div>

        <div className="relative mb-1 mt-3">
          <div className="flex h-3.5 gap-1 overflow-hidden rounded-full">
            <div className="rounded-full bg-[var(--time-acc)]" style={{ width: `calc(${onPct}% - 2px)` }} />
            <div className="flex-1 rounded-full bg-[var(--step)]" />
          </div>
          {headPct !== null && (
            <div className="absolute -top-1 h-6 w-1.5 rounded-full bg-[var(--time-ink)]" style={{ left: `calc(${headPct.toFixed(2)}% - 3px)` }} />
          )}
        </div>
        <p className="mb-4 text-sm opacity-80">{note}</p>

        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-1 min-[900px]:grid-cols-2">
          <Stepper label="เปิดครั้งละ" value={on} onChange={setOn} min={1} max={240} step={1} unit="นาที" />
          <Stepper label="พักครั้งละ" value={off} onChange={setOff} min={0} max={240} step={1} unit="นาที" />
        </div>
      </section>

      {dirty && (
        <div className="col-span-2 flex gap-3">
          <button type="button" onClick={() => onSave({ th, on, off })}
            className="inline-flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-full bg-[var(--btn-bg)] px-6 text-lg font-medium text-[var(--btn-ink)] active:brightness-95">
            <Save className="h-5 w-5" />บันทึกการตั้งค่า
          </button>
          <button type="button" aria-label="คืนค่าเดิม"
            onClick={() => { setTh(Number(settings.temp_threshold)); setOn(settings.cycle_on_min); setOff(settings.cycle_off_min); }}
            className="hs-soft grid h-14 w-14 shrink-0 place-items-center rounded-full">
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
}
