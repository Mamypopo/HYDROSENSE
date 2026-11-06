'use client';

import { Hand, Lock, Power, PowerOff, Sparkles } from 'lucide-react';
import type { Decision, PumpSettings } from '@/lib/pump';
import PumpFace from './PumpFace';

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
};

// ปั๊มพูดเอง: บอกว่าตอนนี้ทำอะไรและเพราะอะไร
function speech(d: Decision | null, threshold: number): string {
  if (!d) return 'รอข้อมูลจากอุปกรณ์อยู่นะ';
  if (d.why === 'dry') return 'น้ำหมดแล้ว ขอหยุดก่อนนะ จะไม่เปิดจนกว่าน้ำจะกลับมา แม้ใครสั่งก็ตาม';
  if (d.why === 'manual') return d.on ? 'ได้เลย! ทำงานให้จนกว่าคุณจะสั่งหยุดนะ' : 'พักอยู่ รอคำสั่งจากคุณ';
  if (d.why === 'hot') return `ร้อนเกิน ${threshold}°C แล้ว รดน้ำให้ต่อเนื่องเลย`;
  if (d.remainMs === 0) return 'อากาศกำลังดี และไม่ได้ตั้งเวลาพัก เลยเปิดไว้ตลอด';
  return d.on
    ? `อากาศกำลังดี เปิดตามรอบอยู่ อีก ${mmss(d.remainMs!)} นาทีจะพัก`
    : `พักตามรอบอยู่ อีก ${mmss(d.remainMs!)} นาทีจะเปิดอีกครั้ง`;
}

export default function ControlCard({ settings, decision, waterOk, pumpOn, onMode, onManualToggle }: Props) {
  const dry = waterOk === false;

  const modeBtn = (m: 'auto' | 'manual', label: string, icon: React.ReactNode) => {
    const active = settings.mode === m;
    return (
      <button
        type="button" role="radio" aria-checked={active} onClick={() => onMode(m)}
        className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full px-4 font-medium transition-colors"
        style={{ background: active ? 'var(--pump-ink)' : 'transparent', color: active ? 'var(--pump-bg)' : 'inherit' }}
      >
        {icon}{label}
      </button>
    );
  };

  return (
    <section aria-labelledby="pump-title" className="hs-b hs-b-pump col-span-2 rounded-[36px]">
      <div className="flex items-center justify-between gap-3">
        <h2 id="pump-title" className="hs-display text-xl font-medium">ปั๊มน้ำ</h2>
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--step)] px-3.5 py-1.5 text-sm font-medium">
          <span className={`h-2 w-2 rounded-full ${pumpOn ? 'hs-pulse bg-[var(--pump-acc)]' : 'bg-current opacity-40'}`} />
          {pumpOn === null ? 'รอข้อมูล' : pumpOn ? 'เปิดอยู่' : 'พักอยู่'}
        </span>
      </div>

      <div className="mt-4 flex items-start gap-3">
        <PumpFace on={pumpOn} dry={dry} />
        <p aria-live="polite" className="hs-bubble relative flex-1 rounded-[22px] px-4 py-3 text-[15px] leading-relaxed">
          {speech(decision, settings.temp_threshold)}
        </p>
      </div>

      <div role="radiogroup" aria-label="โหมดการสั่งปั๊ม" className="mt-5 flex w-full rounded-full bg-[var(--step)] p-1">
        {modeBtn('auto', 'อัตโนมัติ', <Sparkles className="h-4 w-4" />)}
        {modeBtn('manual', 'สั่งเอง', <Hand className="h-4 w-4" />)}
      </div>

      {settings.mode === 'manual' && (
        <div className="mt-3">
          {dry ? (
            <button type="button" disabled className="inline-flex min-h-[56px] w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-[var(--step)] px-6 text-lg font-medium opacity-70">
              <Lock className="h-5 w-5" />ล็อกอยู่ เพราะน้ำแห้ง
            </button>
          ) : settings.manual_pump ? (
            <button type="button" onClick={onManualToggle} className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full bg-[#C8372D] px-6 text-lg font-medium text-white active:brightness-90">
              <PowerOff className="h-5 w-5" />หยุดปั๊ม
            </button>
          ) : (
            <button type="button" onClick={onManualToggle} className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full bg-[var(--pump-acc)] px-6 text-lg font-medium text-white active:brightness-90">
              <Power className="h-5 w-5" />เปิดปั๊ม
            </button>
          )}
        </div>
      )}
    </section>
  );
}
