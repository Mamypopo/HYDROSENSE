export type Reading = {
  id: number;
  created_at: string;
  temperature: number;
  humidity: number;
  water_level: boolean;
  pump_status: boolean;
  /** ความชื้นดิน 0-100 (null = ไม่มีเซนเซอร์ดิน) */
  soil_moisture: number | null;
};
