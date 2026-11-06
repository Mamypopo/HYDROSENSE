'use client';

import { motion, useReducedMotion } from 'framer-motion';

type Props = {
  /** true = น้ำปกติ, false = น้ำแห้ง, null = ยังไม่มีข้อมูล */
  waterOk: boolean | null;
  pumpOn: boolean;
};

export default function TankCard({ waterOk, pumpOn }: Props) {
  const reduce = useReducedMotion();
  const level = waterOk === false ? 0.18 : 1;
  const top = 320 - level * 210;
  const t = reduce ? { duration: 0 } : { duration: 1.2, ease: [0.3, 0.7, 0.2, 1] as const };

  return (
    <section
      aria-labelledby="tank-title"
      className="relative order-1 col-span-2 overflow-hidden rounded-[28px] bg-[#0F2A2E] p-5 text-white shadow-xl sm:p-6 lg:order-none lg:col-span-4 lg:row-span-3"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#46B3C4]/20 blur-3xl" />
      <h2 id="tank-title" className="relative text-lg font-semibold">ถังน้ำและปั๊ม</h2>

      <svg viewBox="0 0 320 360" className="relative mx-auto mt-1 w-full max-w-[300px] lg:max-w-[360px]" role="img" aria-label="ภาพถังน้ำและปั๊ม">
        <defs>
          <clipPath id="tankClip"><rect x="20" y="20" width="150" height="300" rx="16" /></clipPath>
          <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6FD0DE" /><stop offset="1" stopColor="#2E92A5" />
          </linearGradient>
        </defs>
        <g clipPath="url(#tankClip)">
          <motion.rect x={20} width={150} fill="url(#wg)" initial={{ y: 320, height: 0 }} animate={{ y: top, height: 320 - top }} transition={t} />
          <motion.rect x={20} width={150} height={4} fill="#C9F1F7" initial={{ y: 320 }} animate={{ y: top }} transition={t} />
        </g>
        <rect x="20" y="20" width="150" height="300" rx="16" fill="none" stroke="#8DBFC5" strokeWidth="3" />
        <line x1="20" y1="215" x2="170" y2="215" stroke="#fff" strokeOpacity=".8" strokeWidth="2" strokeDasharray="5 5" />
        <circle cx="150" cy="215" r="9" fill="#fff" />
        <text x="30" y="207" fill="#fff" fontSize="13">ลูกลอย</text>

        <path d="M170 290 H245" stroke="#3E6A70" strokeWidth="8" fill="none" strokeLinecap="round" />
        {pumpOn && <path d="M170 290 H245" stroke="#C9F1F7" strokeWidth="4" fill="none" className="hs-flow" />}
        <circle cx="280" cy="290" r="32" fill="#16393E" stroke="#8DBFC5" strokeWidth="3" />
        <g stroke="#fff" strokeWidth="5" strokeLinecap="round" className={pumpOn ? 'hs-spin' : ''}>
          <line x1="280" y1="290" x2="280" y2="270" />
          <line x1="280" y1="290" x2="297" y2="300" />
          <line x1="280" y1="290" x2="263" y2="300" />
        </g>
        <text x="280" y="342" textAnchor="middle" fill="#fff" fontSize="14">ปั๊มน้ำ</text>
      </svg>

      <div className="relative mt-2 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/10 p-4">
          <p className="text-sm text-white/70">ระดับน้ำ</p>
          <p className={`hs-num mt-1 text-2xl font-bold ${waterOk === false ? 'text-[#FF8A80]' : ''}`}>
            {waterOk === null ? '--' : waterOk ? 'น้ำปกติ' : 'น้ำแห้ง'}
          </p>
          <p className="mt-1 text-sm text-white/70">
            {waterOk === null ? 'รอข้อมูลจากอุปกรณ์' : waterOk ? 'เหนือลูกลอย' : 'ต่ำกว่าลูกลอย'}
          </p>
        </div>
        <div className="rounded-2xl bg-white/10 p-4">
          <p className="text-sm text-white/70">ปั๊มน้ำ</p>
          <p className="hs-num mt-1 text-2xl font-bold">{pumpOn ? 'เปิด' : 'ปิด'}</p>
          <p className="mt-1 text-sm text-white/70">สั่งใหม่ทุก 5 วินาที</p>
        </div>
      </div>
    </section>
  );
}
