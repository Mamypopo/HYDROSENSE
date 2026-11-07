// ส่งข้อความเตือนเข้า LINE ผ่าน Messaging API (LINE Notify ปิดบริการแล้ว)
// - ตั้ง LINE_CHANNEL_ACCESS_TOKEN อย่างเดียว = ส่งหา "ทุกคนที่เป็นเพื่อนกับบอท" (broadcast)
// - ตั้ง LINE_TO ด้วย = ส่งหาคนนั้นคนเดียว (user ID หรือ group ID)
// ถ้าไม่ตั้ง token ฟังก์ชันนี้จะข้ามไปเฉยๆ

export const lineEnabled = () => Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN);

export async function sendLine(text: string): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return;
  const to = process.env.LINE_TO?.trim();

  const url = to
    ? 'https://api.line.me/v2/bot/message/push'
    : 'https://api.line.me/v2/bot/message/broadcast';
  const messages = [{ type: 'text', text }];

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(to ? { to, messages } : { messages }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error('[line] send failed:', res.status, await res.text());
  } catch (e) {
    console.error('[line] send error:', e);
  }
}
