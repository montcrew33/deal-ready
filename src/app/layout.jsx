import './globals.css';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'DealReady — M&A Seller Prep',
  description: 'Battle-test your management team before the real presentation.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster 
          theme="dark" 
          position="top-right"
          toastOptions={{
            style: {
              background: '#12172B',
              border: '1px solid #2A3050',
              color: '#E8ECF4',
            },
          }}
        />
      </body>
    </html>
  );
}
