'use client';

type Point = { temp: number; pump: boolean };

const W = 600, H = 170, L = 34, R = 8, T = 10, B = 22, LO = 24, HI = 38;

export default function HistoryChart({ data, threshold }: { data: Point[]; threshold: number }) {
  const n = data.length;
  const x = (i: number) => L + (W - L - R) * (n < 2 ? 0 : i / (n - 1));
  const y = (v: number) => T + (H - T - B) * (1 - (Math.min(HI, Math.max(LO, v)) - LO) / (HI - LO));

  // แถบช่วงที่ปั๊มเปิด
  const bands: { from: number; to: number }[] = [];
  let start: number | null = null;
  data.forEach((p, i) => {
    if (p.pump && start === null) start = i;
    if ((!p.pump || i === n - 1) && start !== null) {
      bands.push({ from: start, to: p.pump ? i : i - 1 });
      start = null;
    }
  });

  const last = data[n - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="กราฟอุณหภูมิย้อนหลัง">
      {[26, 30, 34, 38].map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--ink)" strokeOpacity=".08" />
          <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{v}</text>
        </g>
      ))}
      {bands.map((b, i) => (
        <rect key={i} x={x(b.from)} y={T} width={Math.max(3, x(b.to) - x(b.from))} height={H - T - B} rx="4" fill="var(--accent)" fillOpacity=".18" />
      ))}
      <line x1={L} x2={W - R} y1={y(threshold)} y2={y(threshold)} stroke="#E0782B" strokeWidth="1.5" strokeDasharray="6 5" />
      <text x={W - R} y={y(threshold) - 5} textAnchor="end" fontSize="11" fill="#E0782B">เกณฑ์ {threshold}°C</text>
      {n > 1 && (
        <polyline
          points={data.map((p, i) => `${x(i).toFixed(1)},${y(p.temp).toFixed(1)}`).join(' ')}
          fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
        />
      )}
      {last && <circle cx={x(n - 1)} cy={y(last.temp)} r="5" fill="var(--ink)" />}
      <text x={L} y={H - 5} fontSize="11" fill="var(--muted)">ย้อนหลัง {n} ครั้ง</text>
      <text x={W - R} y={H - 5} textAnchor="end" fontSize="11" fill="var(--muted)">ล่าสุด</text>
    </svg>
  );
}
