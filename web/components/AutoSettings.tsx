'use client';

import { useEffect, useState } from 'react';
import { Flame, RotateCcw, Save, Sprout, Thermometer, Timer } from 'lucide-react';
import type { Decision, PumpSettings } from '@/lib/pump';
import Stepper from './Stepper';
import { mmss } from './ControlCard';

export type AutoValues = { th: number; on: number; off: number; ss: number; se: number };

type Props = {
  settings: PumpSettings;
  decision: Decision | null;
  /** ความชื้นดินล่าสุด (null = ยังไม่มีค่า/ไม่มีเซนเซอร์) */
  soil: number | null;
  onStrategy: (s: 'temp' | 'soil') => void;
  onSave: (v: AutoValues) => void;
};

// ค่าตั้งของโหมดอัตโนมัติ: เลือกว่าจะรดตามดินหรือตามอุณหภูมิ/เวลา แล้วปรับด้วยปุ่ม − / +
// ปุ่มบันทึกจะโผล่เมื่อมีการแก้ค่า
export default function AutoSettings({ settings, decision, soil, onStrategy, onSave }: Props) {
  const cur: AutoValues = {
    th: Number(settings.temp_threshold),
    on: settings.cycle_on_min,
    off: settings.cycle_off_min,
    ss: Number(settings.soil_start_pct ?? 35),
    se: Number(settings.soil_stop_pct ?? 60),
  };
  const [th, setTh] = useState(cur.th);
  const [on, setOn] = useState(cur.on);
  const [off, setOff] = useState(cur.off);
  const [ss, setSs] = useState(cur.ss);
  const [se, setSe] = useState(cur.se);

  useEffect(() => {
    setTh(cur.th); setOn(cur.on); setOff(cur.off); setSs(cur.ss); setSe(cur.se);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur.th, cur.on, cur.off, cur.ss, cur.se]);

  const active = settings.mode === 'auto';
  const bySoil = settings.auto_strategy === 'soil';
  const dirty = th !== cur.th || on !== cur.on || off !== cur.off || ss !== cur.ss || se !== cur.se;
  const gapBad = se - ss < 5;

  // แถบรอบเวลา: ความกว้างตามค่าที่กำลังแก้ หัวชี้ตำแหน่งจริงเฉพาะตอนยังไม่แก้
  const onPct = (on / (on + off)) * 100;
  const cycleLive = active && !bySoil && decision?.why === 'cycle' && !dirty && decision.periodMs;
  const headPct = cycleLive ? ((decision!.elapsedMs ?? 0) / decision!.periodMs!) * 100 : null;

  const timeNote = !decision ? 'รอข้อมูลจากอุปกรณ์'
    : decision.why === 'cycle' ? (decision.remainMs === 0 ? 'ไม่ได้ตั้งเวลาพัก ปั๊มเปิดตลอด' : `ตอนนี้${decision.on ? 'อยู่ช่วงเปิด' : 'อยู่ช่วงพัก'} อีก ${mmss(decision.remainMs ?? 0)} นาทีจะสลับ`)
    : decision.why === 'dry' ? 'รอบเวลาหยุดไว้ เพราะน้ำแห้ง'
    : decision.why === 'hot' ? 'รอบเวลาหยุดไว้ เพราะอากาศร้อนเกินเกณฑ์'
    : 'รอบเวลาใช้ตอนอยู่โหมดอัตโนมัติ';

  const soilNote = soil === null ? 'ยังไม่ได้รับค่าความชื้นดินจากอุปกรณ์ ตอนนี้ระบบใช้กฎอุณหภูมิและรอบเวลาแทน'
    : soil <= ss ? 'ดินแห้งกว่าเกณฑ์ ปั๊มจะรดจนดินชื้นถึงค่าหยุด'
    : soil >= se ? 'ดินชื้นพอแล้ว ปั๊มจะรอจนดินแห้งต่ำกว่าค่าเริ่ม'
    : 'อยู่ระหว่างกลาง ปั๊มคงสถานะเดิมไว้ ไม่เปิดปิดถี่';

  const dim = active ? '' : 'pointer-events-none opacity-45';

  const strat = (v: 'temp' | 'soil', label: string, icon: React.ReactNode) => {
    const sel = settings.auto_strategy === v || (v === 'temp' && !settings.auto_strategy);
    return (
      <button
        type="button" role="radio" aria-checked={sel} onClick={() => onStrategy(v)}
        className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full px-3 text-[15px] font-medium transition-colors"
        style={{ background: sel ? 'var(--bubble)' : 'transparent', color: sel ? 'var(--ink)' : 'inherit', boxShadow: sel ? '0 1px 6px rgba(0,0,0,.08)' : 'none' }}
      >
        {icon}{label}
      </button>
    );
  };

  return (
    <>
      <section aria-labelledby="strat-title" className={`hs-soft col-span-2 rounded-[28px] p-4 sm:p-5 ${dim}`}>
        <h2 id="strat-title" className="hs-display mb-2.5 px-1 text-lg font-medium">โหมดอัตโนมัติ รดน้ำตามอะไร</h2>
        <div role="radiogroup" aria-label="รดน้ำตามอะไร" className="flex w-full rounded-full bg-[var(--line)] p-1">
          {strat('soil', 'ความชื้นดิน', <Sprout className="h-4 w-4" />)}
          {strat('temp', 'อุณหภูมิและเวลา', <Thermometer className="h-4 w-4" />)}
        </div>
      </section>

      {bySoil ? (
        <section aria-labelledby="soil-title" className={`hs-b hs-b-soil col-span-2 rounded-[28px] ${dim}`}>
          <div className="flex items-center gap-2">
            <Sprout className="h-5 w-5" />
            <h2 id="soil-title" className="hs-display text-lg font-medium">ความชื้นดิน</h2>
            <span className="hs-num ml-auto text-2xl font-semibold">{soil === null ? '--' : Math.round(soil)}<span className="ml-0.5 text-base opacity-80">%</span></span>
          </div>

          <div className="relative mb-1 mt-4">
            <div className="h-3.5 overflow-hidden rounded-full bg-[var(--step)]">
              {soil !== null && <div className="h-full rounded-full bg-[var(--soil-acc)] transition-[width] duration-500" style={{ width: `${Math.max(2, Math.min(100, soil))}%` }} />}
            </div>
            <div className="absolute -top-1 h-6 w-1 rounded-full bg-[var(--soil-ink)] opacity-70" style={{ left: `calc(${ss}% - 2px)` }} title="เริ่มรด" />
            <div className="absolute -top-1 h-6 w-1 rounded-full bg-[var(--soil-ink)]" style={{ left: `calc(${se}% - 2px)` }} title="หยุดรด" />
          </div>
          <div className="relative mb-3 h-4 text-xs opacity-75">
            <span className="absolute -translate-x-1/2" style={{ left: `${ss}%` }}>เริ่ม</span>
            <span className="absolute -translate-x-1/2" style={{ left: `${se}%` }}>หยุด</span>
          </div>
          <p className="mb-4 text-sm opacity-85">{soilNote}</p>

          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
            <Stepper label="เริ่มรดเมื่อดินแห้งถึง" value={ss} onChange={setSs} min={5} max={90} step={5} unit="%" />
            <Stepper label="หยุดรดเมื่อดินชื้นถึง" value={se} onChange={setSe} min={10} max={95} step={5} unit="%" />
          </div>
          {gapBad && <p className="mt-3 text-sm font-medium">ค่าหยุดต้องมากกว่าค่าเริ่มอย่างน้อย 5% ไม่งั้นปั๊มจะเปิดปิดถี่</p>}
        </section>
      ) : (
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
            <p className="mb-4 text-sm opacity-80">{timeNote}</p>

            <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-1 min-[900px]:grid-cols-2">
              <Stepper label="เปิดครั้งละ" value={on} onChange={setOn} min={1} max={240} step={1} unit="นาที" />
              <Stepper label="พักครั้งละ" value={off} onChange={setOff} min={0} max={240} step={1} unit="นาที" />
            </div>
          </section>
        </>
      )}

      {dirty && (
        <div className="col-span-2 flex gap-3">
          <button type="button" disabled={gapBad} onClick={() => onSave({ th, on, off, ss, se })}
            className="inline-flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-full bg-[var(--btn-bg)] px-6 text-lg font-medium text-[var(--btn-ink)] active:brightness-95 disabled:opacity-40">
            <Save className="h-5 w-5" />บันทึกการตั้งค่า
          </button>
          <button type="button" aria-label="คืนค่าเดิม"
            onClick={() => { setTh(cur.th); setOn(cur.on); setOff(cur.off); setSs(cur.ss); setSe(cur.se); }}
            className="hs-soft grid h-14 w-14 shrink-0 place-items-center rounded-full">
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
}
