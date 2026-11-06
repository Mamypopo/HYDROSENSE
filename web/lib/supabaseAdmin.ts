import { createClient } from '@supabase/supabase-js';

// ใช้บนเซิร์ฟเวอร์เท่านั้น (API routes) ห้าม import จาก component ฝั่งเบราว์เซอร์
// service_role ข้าม RLS ได้ จึงไม่ต้องเปิดสิทธิ์ให้ anon เข้าตารางโดยตรง
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
