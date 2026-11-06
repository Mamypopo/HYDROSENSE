import type { Metadata, Viewport } from 'next';
import { Anuphan, Mitr } from 'next/font/google';
import './globals.css';
import './hydrosense.css';

const sans = Anuphan({ subsets: ['thai', 'latin'], variable: '--font-sans', display: 'swap' });
const display = Mitr({ subsets: ['thai', 'latin'], weight: ['400', '500', '600'], variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  title: 'HydroSense',
  description: 'ระบบควบคุมการให้น้ำผักไฮโดรโปนิกส์อัจฉริยะ',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        {/* ตั้งโหมดมืดก่อนวาดหน้า กันหน้าวาบ */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('hs-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body className={`hs ${sans.variable} ${display.variable}`} style={{ fontFamily: 'var(--font-sans), sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
