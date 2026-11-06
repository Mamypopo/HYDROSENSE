'use client';

import { Minus, Plus } from 'lucide-react';

type Props = {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  decimals?: number;
};

// ปุ่ม − / + ใหญ่ กดง่ายด้วยนิ้วโป้ง แทนช่องกรอกตัวเลข
export default function Stepper({ label, value, onChange, min, max, step, unit, decimals = 0 }: Props) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Number(v.toFixed(decimals)))));
  return (
    <div role="group" aria-label={label}>
      <p className="mb-1.5 text-sm font-medium opacity-80">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="hs-step" aria-label={`ลด${label}`} disabled={value <= min} onClick={() => set(value - step)}>
          <Minus className="h-5 w-5" />
        </button>
        <p className="min-w-0 text-center" aria-live="polite">
          <span className="hs-display text-[34px] font-medium leading-none">{value.toFixed(decimals)}</span>
          <span className="ml-1 text-base opacity-80">{unit}</span>
        </p>
        <button type="button" className="hs-step" aria-label={`เพิ่ม${label}`} disabled={value >= max} onClick={() => set(value + step)}>
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
