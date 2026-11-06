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
  onMode: (m: 'auto' | 'manual') => void;
  onManualToggle: () => void;
  onSave: (v: { th: number; on: number; off: number }) => void;
};

export default function ControlCard({ settings, decision, waterOk, onMode, onManualToggle, onSave }: Props) {
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

  let reason: { icon: React.ReactNode; text: string } = { icon: <Timer className="mt-0.5 h-6 w-6 shrink-0" />, text: 'รอข้อมูลจากอุปกรณ์' };
  if (d) {
    if (d.why === 'dry') reason = { icon: <Lock className="mt-0.5 h-6 w-6 shrink-0 text-[#C8372D]" />, text: 'ปั๊มปิดอยู่ เพราะน้ำต่ำกว่าลูกลอย ระบบล็อกปั๊มไว้จนกว่าน้ำจะกลับมา แม้สั่งเปิดก็ไม่ทำงาน' };
    else if (d.why === 'manual') reason = { icon: <Hand className="mt-0.5 h-6 w-6 shrink-0" />, text: d.on ? 'คุณสั่งเปิดปั๊มเอง ปั๊มจะทำงานจนกว่าคุณจะสั่งปิด' : 'คุณสั่งปิดปั๊มเอง' };
    else if (d.why === 'hot') reason = { icon: <Flame className="mt-0.5 h-6 w-6 shrink-0 text-[#E0782B]" />, text: `อุณหภูมิเกิน ${settings.temp_threshold}°C ปั๊มเปิดต่อเนื่องจนกว่าอากาศจะเย็นลง` };
    else reason = {
      icon: <Timer className="mt-0.5 h-6 w-6 shrink-0 text-[#2F7D4F]" />,
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
        className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full px-5 font-medium transition-colors sm:flex-none"
        style={{ background: active ? 'var(--accent)' : 'transparent', color: active ? '#fff' : 'var(--muted)' }}
      >
        {icon}{label}
      </button>
    );
  };

  return (
    <section aria-labelledby="ctrl-title" className="hs-tile order-2 col-span-2 lg:order-none lg:col-span-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="ctrl-title" className="text-lg font-semibold">การสั่งปั๊ม</h2>
        <div role="radiogroup" aria-label="โหมดการสั่งปั๊ม" className="hs-soft flex w-full rounded-full p-1 sm:inline-flex sm:w-auto">
          {modeBtn('auto', 'อัตโนมัติ', <Sparkles className="h-4 w-4" />)}
          {modeBtn('manual', 'สั่งเอง', <Hand className="h-4 w-4" />)}
        </div>
      </div>

      <p aria-live="polite" className="hs-soft mt-4 flex items-start gap-3 rounded-2xl px-4 py-4 text-base sm:px-5 sm:text-lg">
        {reason.icon}<span>{reason.text}</span>
      </p>

      {settings.mode === 'manual' && (
        <div className="mt-4">
          {dry ? (
            <button type="button" disabled className="inline-flex min-h-[56px] w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-[#0F2A2E]/30 px-6 text-lg font-semibold text-white sm:w-auto">
              <Lock className="h-5 w-5" />ล็อกอยู่ เพราะน้ำแห้ง
            </button>
          ) : settings.manual_pump ? (
            <button type="button" onClick={onManualToggle} className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-[#C8372D] px-6 text-lg font-semibold text-white hover:bg-[#a92d24] sm:w-auto">
              <PowerOff className="h-5 w-5" />ปิดปั๊ม
            </button>
          ) : (
            <button type="button" onClick={onManualToggle} className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-[#2F7D4F] px-6 text-lg font-semibold text-white hover:bg-[#276a42] sm:w-auto">
              <Power className="h-5 w-5" />เปิดปั๊ม
            </button>
          )}
        </div>
      )}

      {settings.mode === 'auto' && (
        <form onSubmit={submit} className="hs-line-t mt-5 pt-5" noValidate>
          <p className="hs-muted mb-3 text-sm">ตั้งค่าโหมดอัตโนมัติ</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block"><span className="text-sm">เปิดเมื่ออุณหภูมิเกิน (°C)</span>
              <input value={th} onChange={(e) => setTh(e.target.value)} type="number" inputMode="decimal" min={20} max={45} step={0.5} className="hs-field hs-num mt-1" /></label>
            <label className="block"><span className="text-sm">เปิดครั้งละ (นาที)</span>
              <input value={on} onChange={(e) => setOn(e.target.value)} type="number" inputMode="numeric" min={1} max={240} step={1} className="hs-field hs-num mt-1" /></label>
            <label className="block"><span className="text-sm">พักครั้งละ (นาที)</span>
              <input value={off} onChange={(e) => setOff(e.target.value)} type="number" inputMode="numeric" min={0} max={240} step={1} className="hs-field hs-num mt-1" /></label>
          </div>
          <button type="submit" className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#2F7D4F] px-5 font-semibold text-white hover:bg-[#276a42] sm:w-auto">
            <Save className="h-5 w-5" />บันทึกการตั้งค่า
          </button>
        </form>
      )}
    </section>
  );
}
