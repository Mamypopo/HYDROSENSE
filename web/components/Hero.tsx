'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion } from 'framer-motion';
import { Droplets, Moon, Sprout, Sun, Thermometer, Waves } from 'lucide-react';

// three.js โหลดแยก ไม่ทำให้หน้าแรกช้า และไม่รันบนเซิร์ฟเวอร์
const TankScene = dynamic(() => import('./TankScene'), { ssr: false });

type Props = {
  pumpOn: boolean | null;
  today: string;
  online: boolean;
  agoSec: number | null;
  dark: boolean;
  onToggleTheme: () => void;
  headline: string;
  temp: number | null;
  hum: number | null;
  waterOk: boolean | null;
  hot: boolean;
  soil: number | null;
};

function Chip({ icon, value, unit, label, tone = '' }: { icon: ReactNode; value: string; unit?: string; label: string; tone?: string }) {
  return (
    <div className={`hs-glass ${tone} rounded-[26px] px-3.5 py-3 sm:px-4`}>
      <div className="flex items-center gap-1.5 text-[var(--hero-sub)]">{icon}<span className="text-xs sm:text-sm">{label}</span></div>
      <p className="mt-1.5 leading-none">
        <span className="hs-num text-[28px] font-semibold sm:text-[32px]">{value}</span>
        {unit && <span className="hs-num ml-0.5 text-base text-[var(--hero-sub)]">{unit}</span>}
      </p>
    </div>
  );
}

export default function Hero({ pumpOn, today, online, agoSec, dark, onToggleTheme, headline, temp, hum, waterOk, hot, soil }: Props) {
  const reduce = useReducedMotion();
  // จังหวะเดียวที่ขยับเอง: ภาพเลื่อนเข้า แล้วชิปค่อยๆ ขึ้นทีละใบ
  const photoAnim = reduce ? {} : { initial: { scale: 1.12 }, animate: { scale: 1 }, transition: { duration: 1.8, ease: [0.2, 0.7, 0.2, 1] as const } };
  const chipsAnim = reduce ? {} : { initial: 'hidden', animate: 'show', variants: { show: { transition: { staggerChildren: 0.12, delayChildren: 0.5 } } } };
  const item = reduce ? {} : { variants: { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } } };

  return (
    <header className="relative isolate flex min-h-[80svh] flex-col justify-between overflow-hidden p-5 pb-16 text-[var(--hero-ink)] sm:p-8 sm:pb-20 lg:sticky lg:top-0 lg:h-dvh lg:min-h-0 lg:rounded-r-[44px] lg:pb-10">
      <motion.div className="hs-photo absolute inset-0 -z-20" {...photoAnim} />
      <TankScene waterOk={waterOk} pumpOn={pumpOn} hot={hot} />
      <div className="hs-scrim absolute inset-0 -z-[4]" />

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hs-glass grid h-11 w-11 shrink-0 place-items-center rounded-full"><Sprout className="h-5 w-5" /></span>
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">โรงเรือน 1</p>
            <p className="truncate text-sm text-[var(--hero-sub)]">{today}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="hs-glass flex h-11 items-center gap-2 rounded-full px-3.5 text-sm" role="status">
            <span className={`h-2 w-2 rounded-full ${online ? 'hs-pulse bg-[#4CC76F]' : 'bg-[#F2635A]'}`} />
            {online ? 'ออนไลน์' : 'ออฟไลน์'}
          </div>
          <button type="button" onClick={onToggleTheme} aria-label="สลับโหมดมืดและสว่าง" className="hs-glass grid h-11 w-11 place-items-center rounded-full">
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div>
        <h1 className="hs-headline whitespace-pre-line text-[38px] font-medium leading-[1.2] sm:text-5xl">{headline}</h1>
        <p className="mt-3 text-[var(--hero-sub)]">
          {agoSec === null ? 'ยังไม่มีข้อมูลจากอุปกรณ์' : `อัปเดตล่าสุด ${agoSec} วินาทีก่อน`}
        </p>
        <motion.div className={`mt-6 grid gap-2.5 sm:gap-3 ${soil !== null ? 'grid-cols-2 min-[480px]:grid-cols-4' : 'grid-cols-3'}`} {...chipsAnim}>
          <motion.div {...item}>
            <Chip icon={<Thermometer className="h-4 w-4" />} label="อุณหภูมิ" value={temp === null ? '--' : temp.toFixed(1)} unit="°C" tone={hot ? 'hs-glass-warn' : ''} />
          </motion.div>
          <motion.div {...item}>
            <Chip icon={<Droplets className="h-4 w-4" />} label="ความชื้น" value={hum === null ? '--' : String(Math.round(hum))} unit="%" />
          </motion.div>
          <motion.div {...item}>
            <Chip icon={<Waves className="h-4 w-4" />} label="ระดับน้ำ" value={waterOk === null ? '--' : waterOk ? 'ปกติ' : 'แห้ง'} tone={waterOk === false ? 'hs-glass-bad' : ''} />
          </motion.div>
          {soil !== null && (
            <motion.div {...item}>
              <Chip icon={<Sprout className="h-4 w-4" />} label="ความชื้นดิน" value={String(Math.round(soil))} unit="%" />
            </motion.div>
          )}
        </motion.div>
      </div>
    </header>
  );
}
