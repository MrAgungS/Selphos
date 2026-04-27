import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
  title: 'Selphos — Cloud Storage for Your Memories',
  description: 'Store and manage your photos and videos with Selphos. Simple, minimal, yours.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="grain">
        <AuthProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontFamily: 'var(--font-sans)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              },
              success: {
                iconTheme: { primary: 'var(--success)', secondary: 'white' },
              },
              error: {
                iconTheme: { primary: 'var(--destructive)', secondary: 'white' },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
