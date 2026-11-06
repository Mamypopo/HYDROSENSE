'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Cpu, Droplets, LayoutDashboard, LineChart, Moon, Power, PowerOff, Save, Settings,
  SlidersHorizontal, Sprout, Sun, Thermometer, TriangleAlert, Waves, Wifi, type LucideIcon,
} from 'lucide-react';
import Swal, { type SweetAlertOptions } from 'sweetalert2';
import type { Reading } from '@/lib/types';
import { decidePump, type PumpSettings } from '@/lib/pump';
import TankCard from './TankCard';
import RingGauge from './RingGauge';
import ControlCard, { mmss } from './ControlCard';
import HistoryChart from './HistoryChart';

type LogItem = { id: number; t: string; Icon: LucideIcon; tone: string; text: string };

const hhmm = () => new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
const isDark = () => document.documentElement.classList.contains('dark');
const swalTheme = () => (isDark() ? { background: '#12292D', color: '#E6F2EF' } : {});
const toast = (title: string, icon: 'success' | 'info' | 'warning' | 'error' = 'info') =>
  Swal.fire({ toast: true, position: 'top', showConfirmButton: false, timer: 3000, timerProgressBar: true, icon, title, ...swalTheme() });
const fire = (o: SweetAlertOptions) => Swal.fire({ confirmButtonColor: '#2F7D4F', ...swalTheme(), ...o });

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
      addLog(latest.pump_status ? Power : PowerOff, latest.pump_status ? 'text-[#2F7D4F]' : 'hs-muted', `ปั๊ม${latest.pump_status ? 'เปิด' : 'ปิด'}`);
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

  async function onSave({ th, on, off }: { th: number; on: number; off: number }) {
    if (!(th >= 20 && th <= 45) || !(on >= 1) || !(off >= 0)) {
      fire({ icon: 'error', title: 'ค่าไม่ถูกต้อง', text: 'อุณหภูมิต้องอยู่ระหว่าง 20 ถึง 45°C เวลาเปิดอย่างน้อย 1 นาที และเวลาพักไม่ติดลบ' });
      return;
    }
    if (await patchSettings({ temp_threshold: th, cycle_on_min: on, cycle_off_min: off, reset_cycle: true })) {
      addLog(Save, '', `บันทึกการตั้งค่า เกณฑ์ ${th}°C เปิด ${on} พัก ${off} นาที`);
      fire({ icon: 'success', title: 'บันทึกแล้ว', text: `เกณฑ์ ${th}°C เปิด ${on} นาที พัก ${off} นาที เริ่มนับรอบใหม่ตั้งแต่ตอนนี้` });
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
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <p className="hs-muted">{loadFailed ? 'โหลดข้อมูลไม่ได้ ตรวจว่าตั้งค่า .env.local และรัน schema.sql แล้ว' : 'กำลังโหลดข้อมูล'}</p>
      </main>
    );
  }

  const waterOk = latest ? latest.water_level : null;
  const pumpOn = latest ? latest.pump_status : false;
  const decision = latest ? decidePump(settings, { temperature: latest.temperature, water_level: latest.water_level }, now) : null;
  const agoSec = latest ? Math.max(0, Math.round((now - new Date(latest.created_at).getTime()) / 1000)) : null;
  const online = agoSec !== null && agoSec < 20;
  const hot = latest ? latest.temperature > settings.temp_threshold : false;

  const cycleActive = decision?.why === 'cycle';
  const onPct = (settings.cycle_on_min / (settings.cycle_on_min + settings.cycle_off_min)) * 100;
  const headPct = cycleActive && decision?.periodMs ? ((decision.elapsedMs ?? 0) / decision.periodMs) * 100 : 0;

  return (
    <>
      {/* เมนู: ล่างบนมือถือ / ซ้ายบนจอใหญ่ */}
      <nav aria-label="เมนูหลัก"
        className="hs-safe-bottom fixed inset-x-0 bottom-0 z-30 flex justify-around border-t px-2 pt-2 lg:inset-y-0 lg:left-0 lg:right-auto lg:w-[92px] lg:flex-col lg:justify-start lg:gap-2 lg:border-r lg:border-t-0 lg:px-3 lg:py-6"
        style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
        <div className="mb-4 hidden place-items-center lg:grid">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#0F2A2E] text-[#46B3C4]"><Sprout className="h-6 w-6" /></span>
        </div>
        {[
          { Icon: LayoutDashboard, label: 'ภาพรวม', current: true },
          { Icon: LineChart, label: 'ประวัติ' },
          { Icon: Cpu, label: 'อุปกรณ์' },
          { Icon: Settings, label: 'ตั้งค่า' },
        ].map(({ Icon, label, current }) => (
          <button key={label} type="button" aria-current={current ? 'page' : undefined}
            onClick={current ? undefined : () => toast('หน้านี้ยังไม่เปิดให้ใช้')}
            className="hs-nav flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 text-xs font-medium lg:flex-none">
            <Icon className="h-5 w-5" />{label}
          </button>
        ))}
      </nav>

      <div className="px-4 pb-28 pt-4 sm:px-6 lg:pb-10 lg:pl-[124px] lg:pr-8 lg:pt-8">
        <div className="mx-auto max-w-[1180px]">

          <header className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold sm:text-3xl">ภาพรวมโรงเรือน 1</h1>
              <p className="hs-muted mt-0.5 truncate text-sm sm:mt-1 sm:text-base">{today}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="hs-tile flex items-center gap-2 !rounded-full !px-3 !py-2 text-sm sm:!px-4" role="status">
                <span className={`h-2.5 w-2.5 rounded-full ${online ? 'hs-pulse bg-[#2F7D4F]' : 'bg-[#C8372D]'}`} />
                <span className="font-medium">{online ? 'ออนไลน์' : 'ออฟไลน์'}</span>
                {agoSec !== null && <span className="hs-muted hidden sm:inline">อัปเดต {agoSec} วินาทีก่อน</span>}
              </div>
              <button type="button" onClick={toggleTheme} aria-label="สลับโหมดมืดและสว่าง" className="hs-tile grid h-11 w-11 place-items-center !rounded-full !p-0">
                {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>
          </header>

          {/* มือถือ 2 คอลัมน์ / จอใหญ่ 12 คอลัมน์ แบบ Bento */}
          <main className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:mt-6 lg:grid-cols-12">
            <TankCard waterOk={waterOk} pumpOn={pumpOn} />

            <ControlCard settings={settings} decision={decision} waterOk={waterOk} onMode={onMode} onManualToggle={onManualToggle} onSave={onSave} />

            <RingGauge
              className="order-3 lg:order-none lg:col-span-4"
              title="อุณหภูมิ" icon={<Thermometer className="h-5 w-5 text-[#E0782B]" />}
              value={latest ? latest.temperature : null} min={20} max={40} unit="°C" digits={1}
              color={hot ? '#E0782B' : '#2F7D4F'} valueColor={hot ? '#E0782B' : undefined}
              tick={settings.temp_threshold} caption={`ขีดดำคือเกณฑ์ ${settings.temp_threshold}°C`}
            />
            <RingGauge
              className="order-4 lg:order-none lg:col-span-4"
              title="ความชื้น" icon={<Droplets className="h-5 w-5 text-[#46B3C4]" />}
              value={latest ? latest.humidity : null} min={0} max={100} unit="%"
              color="#46B3C4" caption="ผักสบายที่ 60 ถึง 80%"
            />

            <section aria-labelledby="hist-title" className="hs-tile order-5 col-span-2 lg:order-none lg:col-span-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="hist-title" className="text-lg font-semibold">อุณหภูมิย้อนหลัง</h2>
                <p className="hs-muted text-sm">แถบเขียวคือช่วงที่ปั๊มเปิด</p>
              </div>
              <HistoryChart data={hist.map((r) => ({ temp: r.temperature, pump: r.pump_status }))} threshold={settings.temp_threshold} />
            </section>

            <section aria-labelledby="cy-title" className="hs-tile order-6 col-span-2 lg:order-none lg:col-span-5">
              <h2 id="cy-title" className="text-lg font-semibold">รอบเปิดและพัก</h2>
              <div className="mt-5 transition-opacity" style={{ opacity: cycleActive ? 1 : 0.35 }}>
                <div className="relative">
                  <div className="flex h-4 overflow-hidden rounded-full">
                    <div className="bg-[#2F7D4F]" style={{ width: `${onPct}%` }} />
                    <div className="flex-1" style={{ background: 'var(--soft)' }} />
                  </div>
                  <div className="absolute -top-1.5 h-7 w-1.5 rounded-full" style={{ background: 'var(--ink)', left: `calc(${headPct.toFixed(2)}% - 3px)` }} />
                </div>
                <div className="mt-3 flex justify-between text-sm">
                  <span className="font-medium">เปิด {settings.cycle_on_min} นาที</span>
                  <span className="hs-muted">พัก {settings.cycle_off_min} นาที</span>
                </div>
              </div>
              <p className="hs-muted mt-4 text-sm">
                {!decision ? 'รอข้อมูลจากอุปกรณ์'
                  : cycleActive
                    ? (decision.remainMs === 0 ? 'ไม่ได้ตั้งเวลาพัก ปั๊มเปิดตลอด' : `ตอนนี้${decision.on ? 'อยู่ช่วงเปิด' : 'อยู่ช่วงพัก'} อีก ${mmss(decision.remainMs ?? 0)} นาทีจะสลับ`)
                    : decision.why === 'dry' ? 'รอบเวลาหยุดไว้ เพราะน้ำแห้ง'
                    : decision.why === 'manual' ? 'รอบเวลาไม่ทำงานในโหมดสั่งเอง'
                    : 'รอบเวลาหยุดไว้ เพราะอากาศร้อนเกินเกณฑ์'}
              </p>
            </section>

            <section aria-labelledby="log-title" className="hs-tile order-7 col-span-2 lg:order-none lg:col-span-7">
              <h2 id="log-title" className="text-lg font-semibold">เหตุการณ์ล่าสุด</h2>
              <ul className="mt-3 space-y-1">
                {log.length === 0 && <li className="hs-muted px-2 py-2">ยังไม่มีเหตุการณ์ในรอบนี้ ระบบจะบันทึกเมื่อปั๊มหรือระดับน้ำเปลี่ยน</li>}
                {log.map(({ id, t, Icon, tone, text }) => (
                  <li key={id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                    <span className={`hs-soft grid h-9 w-9 shrink-0 place-items-center rounded-full ${tone}`}><Icon className="h-4 w-4" /></span>
                    <span className="flex-1">{text}</span>
                    <span className="hs-num hs-muted text-sm">{t}</span>
                  </li>
                ))}
              </ul>
            </section>
          </main>
        </div>
      </div>
    </>
  );
}
