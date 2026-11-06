// หน้าปั๊มตัวเดียวกับที่อยู่ในฉาก 3D เพื่อให้ตัวละครต่อเนื่องกัน
export default function PumpFace({ on, dry, size = 56 }: { on: boolean | null; dry: boolean; size?: number }) {
  const mouth = dry ? 'M19 37 Q24 32 29 37' : on ? 'M19 33 Q24 39 29 33' : 'M20 35 H28';
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      <line x1="24" y1="8" x2="24" y2="4" stroke="#E8B84A" strokeWidth="3" strokeLinecap="round" />
      <line x1="14" y1="4" x2="34" y2="4" stroke="#FF7B6B" strokeWidth="3" strokeLinecap="round" />
      <rect x="4" y="8" width="40" height="36" rx="15" fill="#FFD166" />
      <circle cx="16" cy="24" r="3" fill="#2B2B2B" />
      <circle cx="32" cy="24" r="3" fill="#2B2B2B" />
      <circle cx="11" cy="31" r="3.2" fill="#FF8FA3" opacity=".7" />
      <circle cx="37" cy="31" r="3.2" fill="#FF8FA3" opacity=".7" />
      <path d={mouth} stroke="#2B2B2B" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      {dry && <path d="M40 14 q3 4 0 7 q-3 -3 0 -7z" fill="#58C3D3" />}
    </svg>
  );
}
