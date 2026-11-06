export type Reading = {
  id: number;
  created_at: string;
  temperature: number;
  humidity: number;
  water_level: boolean;
  pump_status: boolean;
};
