import { DM_Sans } from 'next/font/google';

const dm = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-dm',
  display: 'swap',
});

export const metadata = { title: 'DealReady — Design Preview' };

export default function DashboardV2Layout({ children }) {
  return (
    <div
      className={dm.variable}
      style={{
        fontFamily: 'var(--font-dm), "DM Sans", system-ui, sans-serif',
        background: '#F0EBE1',
        minHeight: '100vh',
      }}
    >
      {children}
    </div>
  );
}
