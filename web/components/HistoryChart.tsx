'use client';

type Point = { temp: number; pump: boolean };

const W = 600, H = 190, L = 34, R = 10, T = 14, B = 24, LO = 24, HI = 38;

// เส้นโค้งนุ่ม (Catmull-Rom แปลงเป็น Bezier)
function smooth(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export default function HistoryChart({ data, threshold }: { data: Point[]; threshold: number }) {
  const n = data.length;
  const x = (i: number) => L + (W - L - R) * (n < 2 ? 0 : i / (n - 1));
  const y = (v: number) => T + (H - T - B) * (1 - (Math.min(HI, Math.max(LO, v)) - LO) / (HI - LO));

  const bands: { from: number; to: number }[] = [];
  let start: number | null = null;
  data.forEach((p, i) => {
    if (p.pump && start === null) start = i;
    if ((!p.pump || i === n - 1) && start !== null) {
      bands.push({ from: start, to: p.pump ? i : i - 1 });
      start = null;
    }
  });

  const pts = data.map((p, i) => [x(i), y(p.temp)] as [number, number]);
  const line = smooth(pts);
  const area = n > 1 ? `${line} L${x(n - 1).toFixed(1)},${H - B} L${x(0).toFixed(1)},${H - B} Z` : '';
  const last = data[n - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label="กราฟอุณหภูมิย้อนหลัง">
      <defs>
        <linearGradient id="plotFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--plot-ink)', stopOpacity: 0.22 }} />
          <stop offset="1" style={{ stopColor: 'var(--plot-ink)', stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      {[26, 30, 34, 38].map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--plot-ink)" strokeOpacity=".14" strokeDasharray="2 6" strokeLinecap="round" />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="12" fill="var(--plot-ink)" fillOpacity=".7">{v}</text>
        </g>
      ))}
      {bands.map((b, i) => (
        <rect key={i} x={x(b.from)} y={T} width={Math.max(6, x(b.to) - x(b.from))} height={H - T - B} rx="8" fill="var(--pump-acc)" fillOpacity=".26" />
      ))}
      <line x1={L} x2={W - R} y1={y(threshold)} y2={y(threshold)} stroke="#F08A3C" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" />
      <text x={W - R} y={y(threshold) - 7} textAnchor="end" fontSize="12" fill="#C2621A">ร้อนเกิน {threshold}°C ปั๊มเปิด</text>
      {n > 1 && <path d={area} fill="url(#plotFill)" />}
      {n > 1 && <path d={line} fill="none" stroke="var(--plot-ink)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
      {last && <circle cx={x(n - 1)} cy={y(last.temp)} r="6" fill="var(--plot-ink)" stroke="var(--plot-bg)" strokeWidth="3" />}
      <text x={L} y={H - 4} fontSize="12" fill="var(--plot-ink)" fillOpacity=".7">ย้อนหลัง {n} ครั้ง</text>
      <text x={W - R} y={H - 4} textAnchor="end" fontSize="12" fill="var(--plot-ink)" fillOpacity=".7">ล่าสุด</text>
    </svg>
  );
}
