'use client';

import { useEffect, useState } from 'react';
import { Flame, Hand, Lock, Power, PowerOff, Save, Sparkles, Timer } from 'lucide-react';
import type { Decision, PumpSettings } from '@/lib/pump';

export const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};

type Props = {
  settings: PumpSettings;
  decision: Decision | null;
  waterOk: boolean | null;
  pumpOn: boolean | null;
  onMode: (m: 'auto' | 'manual') => void;
  onManualToggle: () => void;
  onSave: (v: { th: number; on: number; off: number }) => void;
};

export default function ControlCard({ settings, decision, waterOk, pumpOn, onMode, onManualToggle, onSave }: Props) {
  const [th, setTh] = useState(String(settings.temp_threshold));
  const [on, setOn] = useState(String(settings.cycle_on_min));
  const [off, setOff] = useState(String(settings.cycle_off_min));

  useEffect(() => {
    setTh(String(settings.temp_threshold));
    setOn(String(settings.cycle_on_min));
    setOff(String(settings.cycle_off_min));
  }, [settings.temp_threshold, settings.cycle_on_min, settings.cycle_off_min]);

  const dry = waterOk === false;
  const d = decision;

  let reason: { icon: React.ReactNode; text: string } = { icon: <Timer className="mt-0.5 h-5 w-5 shrink-0" />, text: 'รอข้อมูลจากอุปกรณ์' };
  if (d) {
    if (d.why === 'dry') reason = { icon: <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[#C8372D]" />, text: 'น้ำต่ำกว่าลูกลอย ระบบล็อกปั๊มไว้จนกว่าน้ำจะกลับมา แม้สั่งเปิดก็ไม่ทำงาน' };
    else if (d.why === 'manual') reason = { icon: <Hand className="mt-0.5 h-5 w-5 shrink-0" />, text: d.on ? 'คุณสั่งเปิดปั๊มเอง ปั๊มจะทำงานจนกว่าคุณจะสั่งปิด' : 'คุณสั่งปิดปั๊มเอง' };
    else if (d.why === 'hot') reason = { icon: <Flame className="mt-0.5 h-5 w-5 shrink-0 text-[#E0782B]" />, text: `อุณหภูมิเกิน ${settings.temp_threshold}°C ปั๊มเปิดต่อเนื่องจนกว่าอากาศจะเย็นลง` };
    else reason = {
      icon: <Timer className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" />,
      text: d.remainMs === 0 ? 'อุณหภูมิปกติ ปั๊มเปิดตลอด เพราะไม่ได้ตั้งเวลาพัก'
        : d.on ? `อุณหภูมิปกติ ปั๊มเปิดตามรอบ อีก ${mmss(d.remainMs!)} นาทีจะพัก`
        : `อุณหภูมิปกติ ปั๊มพักตามรอบ อีก ${mmss(d.remainMs!)} นาทีจะเปิดอีกครั้ง`,
    };
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ th: parseFloat(th), on: parseInt(on, 10), off: parseInt(off, 10) });
  }

  const modeBtn = (m: 'auto' | 'manual', label: string, icon: React.ReactNode) => {
    const active = settings.mode === m;
    return (
      <button
        type="button" role="radio" aria-checked={active} onClick={() => onMode(m)}
        className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full px-5 font-medium transition-colors"
        style={{ background: active ? 'var(--accent)' : 'transparent', color: active ? '#fff' : 'var(--muted)' }}
      >
        {icon}{label}
      </button>
    );
  };

  return (
    <section aria-labelledby="ctrl-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="ctrl-title" className="text-xl font-semibold">การสั่งปั๊ม</h2>
        <span className="hs-soft inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium">
          <span className={`h-2 w-2 rounded-full ${pumpOn ? 'hs-pulse bg-[var(--accent)]' : 'bg-[var(--muted)]'}`} />
          {pumpOn === null ? 'รอข้อมูล' : pumpOn ? 'ปั๊มเปิดอยู่' : 'ปั๊มปิดอยู่'}
        </span>
      </div>

      <div role="radiogroup" aria-label="โหมดการสั่งปั๊ม" className="hs-soft mt-4 flex w-full rounded-full p-1">
        {modeBtn('auto', 'อัตโนมัติ', <Sparkles className="h-4 w-4" />)}
        {modeBtn('manual', 'สั่งเอง', <Hand className="h-4 w-4" />)}
      </div>

      <p aria-live="polite" className="mt-4 flex items-start gap-3 text-base leading-relaxed">
        {reason.icon}<span>{reason.text}</span>
      </p>

      {settings.mode === 'manual' && (
        <div className="mt-4">
          {dry ? (
            <button type="button" disabled className="inline-flex min-h-[56px] w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-[var(--soft)] px-6 text-lg font-semibold text-[var(--muted)]">
              <Lock className="h-5 w-5" />ล็อกอยู่ เพราะน้ำแห้ง
            </button>
          ) : settings.manual_pump ? (
            <button type="button" onClick={onManualToggle} className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full bg-[#C8372D] px-6 text-lg font-semibold text-white active:brightness-90">
              <PowerOff className="h-5 w-5" />ปิดปั๊ม
            </button>
          ) : (
            <button type="button" onClick={onManualToggle} className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 text-lg font-semibold text-white active:brightness-90">
              <Power className="h-5 w-5" />เปิดปั๊ม
            </button>
          )}
        </div>
      )}

      {settings.mode === 'auto' && (
        <form onSubmit={submit} className="mt-5" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 block"><span className="text-sm">เปิดเมื่ออุณหภูมิเกิน (°C)</span>
              <input value={th} onChange={(e) => setTh(e.target.value)} type="number" inputMode="decimal" min={20} max={45} step={0.5} className="hs-field hs-num mt-1" /></label>
            <label className="block"><span className="text-sm">เปิดครั้งละ (นาที)</span>
              <input value={on} onChange={(e) => setOn(e.target.value)} type="number" inputMode="numeric" min={1} max={240} step={1} className="hs-field hs-num mt-1" /></label>
            <label className="block"><span className="text-sm">พักครั้งละ (นาที)</span>
              <input value={off} onChange={(e) => setOff(e.target.value)} type="number" inputMode="numeric" min={0} max={240} step={1} className="hs-field hs-num mt-1" /></label>
          </div>
          <button type="submit" className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 font-semibold text-white active:brightness-90">
            <Save className="h-5 w-5" />บันทึกการตั้งค่า
          </button>
        </form>
      )}
    </section>
  );
}
