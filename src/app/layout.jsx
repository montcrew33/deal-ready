import './globals.css';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: 'DealReady — M&A Seller Prep',
  description: 'Battle-test your management team before the real presentation.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: '#111520',
              border: '1px solid rgba(36,43,61,0.9)',
              color: '#F1F5F9',
              fontSize: '13px',
              fontFamily: 'var(--font-inter), Inter, sans-serif',
            },
          }}
        />
      </body>
    </html>
  );
}
