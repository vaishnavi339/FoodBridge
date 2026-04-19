import './globals.css';
import 'leaflet/dist/leaflet.css';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import Navbar from '@/components/Navbar';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'FoodBridge — Connecting Surplus Food to Communities in Need',
  description: 'Real-time platform connecting food donors with NGOs across Delhi. Reduce food waste, feed communities.',
  keywords: 'food donation, NGO, food waste, surplus food, Delhi, food bank',
};

import MobileTabBar from '@/components/MobileTabBar';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'Inter', sans-serif" }}>
        <AuthProvider>
          <SocketProvider>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-1 flex flex-col relative w-full">
                {children}
              </main>
              <MobileTabBar />
            </div>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: '#1e293b',
                  color: '#f1f5f9',
                  border: '1px solid rgba(148,163,184,0.15)',
                  borderRadius: '0.75rem',
                },
                success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
                error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
              }}
            />
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
