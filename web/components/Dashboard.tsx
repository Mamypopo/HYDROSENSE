'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Cpu, LayoutDashboard, LineChart, Power, PowerOff, Save, Settings,
  SlidersHorizontal, TriangleAlert, Waves, type LucideIcon,
} from 'lucide-react';
import Swal, { type SweetAlertOptions } from 'sweetalert2';
import type { Reading } from '@/lib/types';
import { decidePump, type PumpSettings } from '@/lib/pump';
import Hero from './Hero';
import ControlCard from './ControlCard';
import AutoSettings, { type AutoValues } from './AutoSettings';
import HistoryChart from './HistoryChart';

type LogItem = { id: number; t: string; Icon: LucideIcon; tone: string; text: string };

const hhmm = () => new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
const isDark = () => document.documentElement.classList.contains('dark');
const swalTheme = () => (isDark() ? { background: '#1A2B20', color: '#E8F0E6' } : {});
const toast = (title: string, icon: 'success' | 'info' | 'warning' | 'error' = 'info') =>
  Swal.fire({ toast: true, position: 'top', showConfirmButton: false, timer: 3000, timerProgressBar: true, icon, title, ...swalTheme() });
const fire = (o: SweetAlertOptions) => Swal.fire({ confirmButtonColor: '#1f78b4', ...swalTheme(), ...o });

export default function Dashboard() {
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [settings, setSettings] = useState<PumpSettings | null>(null);
  const [hist, setHist] = useState<Reading[]>([]);
  const [now, setNow] = useState(0);
  const [today, setToday] = useState('');
  const [dark, setDark] = useState(false);
  const [log, setLog] = useState<LogItem[]>([]);
  const logId = useRef(0);
  const prev = useRef<{ pump?: boolean; water?: boolean }>({});

  const latest = hist.length ? hist[hist.length - 1] : null;

  const addLog = useCallback((Icon: LucideIcon, tone: string, text: string) => {
    setLog((l) => [{ id: ++logId.current, t: hhmm(), Icon, tone, text }, ...l].slice(0, 6));
  }, []);

  // ----- โหลดข้อมูลจาก /api/dashboard ทุก 3 วินาที -----
  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard', { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const j = (await res.json()) as { settings: PumpSettings; readings: Reading[] };
      setSettings(j.settings);
      setHist(j.readings);
      setLoadFailed(false);
      setReady(true);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    setNow(Date.now());
    setToday(new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    setDark(isDark());
    load();
    const poll = setInterval(load, 3000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [load]);

  // ----- บันทึกเหตุการณ์เมื่อสถานะจริงจากอุปกรณ์เปลี่ยน -----
  useEffect(() => {
    if (!latest) return;
    const p = prev.current;
    if (p.water !== undefined && p.water !== latest.water_level) {
      if (!latest.water_level) { addLog(TriangleAlert, 'text-[#C8372D]', 'น้ำต่ำกว่าลูกลอย ระบบปิดปั๊มแล้ว'); toast('น้ำแห้ง ระบบปิดปั๊มแล้ว', 'warning'); }
      else addLog(Waves, 'text-[#46B3C4]', 'น้ำกลับมาเหนือลูกลอย');
    }
    if (p.pump !== undefined && p.pump !== latest.pump_status) {
      addLog(latest.pump_status ? Power : PowerOff, latest.pump_status ? 'text-[var(--accent)]' : 'opacity-60', `ปั๊ม${latest.pump_status ? 'เปิด' : 'ปิด'}`);
    }
    prev.current = { pump: latest.pump_status, water: latest.water_level };
  }, [latest, addLog]);

  // ----- การกระทำของผู้ใช้ -----
  async function patchSettings(patch: Partial<PumpSettings> & { reset_cycle?: boolean }) {
    try {
      const res = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      if (!res.ok) throw new Error(String(res.status));
      const j = (await res.json()) as { settings: PumpSettings };
      setSettings(j.settings);
      return true;
    } catch {
      fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: 'ลองใหม่อีกครั้ง หรือตรวจการเชื่อมต่ออินเทอร์เน็ต' });
      return false;
    }
  }

  async function onMode(m: 'auto' | 'manual') {
    if (!settings || settings.mode === m) return;
    if (await patchSettings({ mode: m })) {
      addLog(SlidersHorizontal, '', `เปลี่ยนเป็นโหมด${m === 'auto' ? 'อัตโนมัติ' : 'สั่งเอง'}`);
      toast(m === 'auto' ? 'เปลี่ยนเป็นโหมดอัตโนมัติ' : 'เปลี่ยนเป็นโหมดสั่งเอง');
    }
  }

  async function onManualToggle() {
    if (!settings || latest?.water_level === false) return;
    if (!settings.manual_pump) {
      const r = await fire({ title: 'เปิดปั๊มเอง?', text: 'ปั๊มจะทำงานต่อเนื่องจนกว่าคุณจะกดปิด หรือน้ำแห้ง', icon: 'question', showCancelButton: true, confirmButtonText: 'เปิดปั๊ม', cancelButtonText: 'ยกเลิก' });
      if (!r.isConfirmed) return;
    }
    if (await patchSettings({ manual_pump: !settings.manual_pump })) {
      toast(settings.manual_pump ? 'สั่งปิดปั๊มแล้ว' : 'สั่งเปิดปั๊มแล้ว (อุปกรณ์จะทำงานภายใน 5 วินาที)', 'success');
    }
  }

  async function onStrategy(v: 'temp' | 'soil') {
    if (!settings || settings.auto_strategy === v) return;
    if (await patchSettings({ auto_strategy: v })) {
      addLog(SlidersHorizontal, '', `รดน้ำตาม${v === 'soil' ? 'ความชื้นดิน' : 'อุณหภูมิและเวลา'}`);
      toast(v === 'soil' ? 'รดน้ำตามความชื้นดิน' : 'รดน้ำตามอุณหภูมิและเวลา');
    }
  }

  async function onSave({ th, on, off, ss, se }: AutoValues) {
    if (!settings) return;
    if (!(th >= 20 && th <= 45) || !(on >= 1) || !(off >= 0)) {
      fire({ icon: 'error', title: 'ค่าไม่ถูกต้อง', text: 'อุณหภูมิต้องอยู่ระหว่าง 20 ถึง 45°C เวลาเปิดอย่างน้อย 1 นาที และเวลาพักไม่ติดลบ' });
      return;
    }
    if (!(ss >= 5 && se <= 95 && se - ss >= 5)) {
      fire({ icon: 'error', title: 'ค่าดินไม่ถูกต้อง', text: 'ค่าหยุดรดต้องมากกว่าค่าเริ่มรดอย่างน้อย 5% และอยู่ระหว่าง 5 ถึง 95%' });
      return;
    }
    const cycleChanged = on !== settings.cycle_on_min || off !== settings.cycle_off_min;
    const ok = await patchSettings({
      temp_threshold: th, cycle_on_min: on, cycle_off_min: off, soil_start_pct: ss, soil_stop_pct: se,
      ...(cycleChanged ? { reset_cycle: true } : {}),
    });
    if (ok) {
      const text = settings.auto_strategy === 'soil'
        ? `เริ่มรดเมื่อดินแห้งถึง ${ss}% หยุดเมื่อชื้นถึง ${se}%`
        : `เกณฑ์ ${th}°C เปิด ${on} นาที พัก ${off} นาที${cycleChanged ? ' เริ่มนับรอบใหม่ตั้งแต่ตอนนี้' : ''}`;
      addLog(Save, '', `บันทึกการตั้งค่า ${text}`);
      fire({ icon: 'success', title: 'บันทึกแล้ว', text });
    }
  }

  function toggleTheme() {
    const d = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('hs-theme', d ? 'dark' : 'light'); } catch {}
    setDark(d);
  }

  // ----- ค่าที่ใช้แสดง -----
  if (!ready || !settings) {
    return (
      <main className="hs-sheet grid min-h-dvh place-items-center px-6 text-center">
        <p className="hs-muted">{loadFailed ? 'โหลดข้อมูลไม่ได้ ตรวจว่าตั้งค่า Environment Variables และรัน schema.sql แล้ว' : 'กำลังโหลดข้อมูล'}</p>
      </main>
    );
  }

  const waterOk = latest ? latest.water_level : null;
  const pumpOn = latest ? latest.pump_status : null;
  // ความชื้นดินล่าสุด (null = ไม่มีเซนเซอร์ดินหรือยังไม่ได้ส่งมา)
  const soil = latest && latest.soil_moisture !== null && latest.soil_moisture !== undefined ? Number(latest.soil_moisture) : null;
  const decision = latest ? decidePump(settings, { temperature: latest.temperature, water_level: latest.water_level, soil_moisture: soil }, now) : null;
  const agoSec = latest ? Math.max(0, Math.round((now - new Date(latest.created_at).getTime()) / 1000)) : null;
  const online = agoSec !== null && agoSec < 20;
  const hot = latest ? latest.temperature > settings.temp_threshold : false;
  const soilMode = settings.auto_strategy === 'soil' && settings.mode === 'auto' && soil !== null;

  const headline = !latest ? 'รอข้อมูล\nจากอุปกรณ์นะ'
    : waterOk === false ? 'น้ำแห้งแล้ว\nปั๊มพักก่อนนะ'
    : soilMode && pumpOn ? 'ดินแห้ง\nกำลังรดน้ำให้'
    : soilMode ? 'ดินยังชื้นอยู่\nปั๊มพักก่อนนะ'
    : hot && pumpOn ? 'ร้อนจัง\nกำลังรดน้ำให้'
    : hot ? 'ร้อนจัง\nรอปั๊มทำงาน'
    : pumpOn ? 'ผักกำลัง\nดื่มน้ำอยู่'
    : 'ทุกอย่างปกติ\nผักสบายดี';

  const nav = [
    { Icon: LayoutDashboard, label: 'ภาพรวม', current: true },
    { Icon: LineChart, label: 'ประวัติ' },
    { Icon: Cpu, label: 'อุปกรณ์' },
    { Icon: Settings, label: 'ตั้งค่า' },
  ];

  return (
    <div className="lg:grid lg:grid-cols-[minmax(420px,44%)_1fr]">
      <Hero
        pumpOn={pumpOn} today={today} online={online} agoSec={agoSec} dark={dark} onToggleTheme={toggleTheme}
        headline={headline} temp={latest ? latest.temperature : null} hum={latest ? latest.humidity : null}
        waterOk={waterOk} hot={hot} soil={soil}
      />

      <main className="hs-sheet relative z-10 -mt-10 rounded-t-[40px] px-4 pb-36 pt-7 sm:px-8 lg:mt-0 lg:min-h-dvh lg:rounded-none lg:px-14 lg:pb-16 lg:pt-14">
        <div className="mx-auto max-w-[640px]">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <ControlCard settings={settings} decision={decision} waterOk={waterOk} pumpOn={pumpOn} soil={soil} onMode={onMode} onManualToggle={onManualToggle} />

            <AutoSettings settings={settings} decision={decision} soil={soil} onStrategy={onStrategy} onSave={onSave} />

            <section aria-labelledby="hist-title" className="hs-b hs-b-plot col-span-2 rounded-[32px]">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <h2 id="hist-title" className="hs-display text-lg font-medium">อุณหภูมิที่ผ่านมา</h2>
                <p className="text-sm opacity-75">แถบฟ้าคือช่วงที่ปั๊มเปิด</p>
              </div>
              <HistoryChart data={hist.map((r) => ({ temp: r.temperature, pump: r.pump_status }))} threshold={settings.temp_threshold} />
            </section>

            <section aria-labelledby="log-title" className="hs-b hs-b-diary col-span-2 rounded-[24px_40px_24px_40px]">
              <h2 id="log-title" className="hs-display text-lg font-medium">วันนี้ในฟาร์ม</h2>
              <ul className="mt-3 space-y-2.5">
                {log.length === 0 && <li className="py-1 opacity-80">ยังเงียบอยู่ ระบบจะจดไว้เมื่อปั๊มหรือระดับน้ำเปลี่ยน</li>}
                {log.map(({ id, t, Icon, tone, text }) => (
                  <li key={id} className="flex items-center gap-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--step)] ${tone}`}><Icon className="h-[18px] w-[18px]" /></span>
                    <span className="flex-1 leading-snug">{text}</span>
                    <span className="hs-num text-sm opacity-70">{t}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </main>

      {/* แคปซูลเมนูลอยด้านล่าง (เฉพาะมือถือ) */}
      <nav aria-label="เมนูหลัก" className="hs-pillnav fixed left-1/2 z-30 flex -translate-x-1/2 gap-1 rounded-full p-1.5 lg:hidden">
        {nav.map(({ Icon, label, current }) => (
          <button key={label} type="button" aria-label={label} aria-current={current ? 'page' : undefined}
            onClick={current ? undefined : () => toast('หน้านี้ยังไม่เปิดให้ใช้')}
            className="hs-navbtn grid h-12 w-12 place-items-center rounded-full">
            <Icon className="h-5 w-5" />
          </button>
        ))}
      </nav>
    </div>
  );
}
