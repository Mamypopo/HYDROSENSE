'use client';

import type { ReactNode } from 'react';

const ARC = 254.5; // ความยาวส่วนโค้ง 270°
const FULL = 339.3; // เส้นรอบวงเต็ม (r = 54)

type Props = {
  title: string;
  icon: ReactNode;
  value: number | null;
  min: number;
  max: number;
  unit: string;
  digits?: number;
  color: string;
  /** ขีดเกณฑ์บนวงแหวน (ถ้ามี) */
  tick?: number;
  valueColor?: string;
  caption: string;
  className?: string;
};

export default function RingGauge({ title, icon, value, min, max, unit, digits = 0, color, tick, valueColor, caption, className = '' }: Props) {
  const frac = value === null ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min)));
  const tickAngle = tick === undefined ? 0 : 135 + 270 * Math.min(1, Math.max(0, (tick - min) / (max - min)));

  return (
    <section aria-label={title} className={`hs-tile ${className}`}>
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="relative mx-auto mt-1 w-full max-w-[190px]">
        <svg viewBox="0 0 140 140" className="w-full" aria-hidden="true">
          <circle cx="70" cy="70" r="54" fill="none" stroke="var(--soft)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${ARC} ${FULL}`} transform="rotate(135 70 70)" />
          <circle
            cx="70" cy="70" r="54" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${ARC * frac} ${FULL}`} transform="rotate(135 70 70)"
            style={{ transition: 'stroke-dasharray .7s, stroke .4s' }}
          />
          {tick !== undefined && (
            <g transform={`rotate(${tickAngle} 70 70)`}>
              <line x1="128" y1="70" x2="138" y2="70" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
            </g>
          )}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <p>
            <span className="hs-num text-4xl font-bold sm:text-5xl" style={{ color: valueColor }}>
              {value === null ? '--' : value.toFixed(digits)}
            </span>
            <span className="hs-num hs-muted text-lg sm:text-xl">{unit}</span>
          </p>
        </div>
      </div>
      <p className="hs-muted -mt-1 text-center text-sm">{caption}</p>
    </section>
  );
}
