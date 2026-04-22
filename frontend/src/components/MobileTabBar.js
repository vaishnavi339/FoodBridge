'use client';

import { usePathname, useRouter } from 'next/navigation';
import { FiHome, FiMapPin, FiPlusCircle, FiClipboard, FiUser } from 'react-icons/fi';

export default function MobileTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  // Optionally hide on non-authenticated / specific unauthenticated routes like "/" or "/login"
  // But the prompt says "Replace the top navbar on mobile with a fixed bottom tab bar... apply across all existing pages"
  // So we will render it globally but maybe selectively style it.
  
  const tabs = [
    { path: '/donor/dashboard', label: 'Home', Icon: FiHome },
    { path: '/map', label: 'Live Map', Icon: FiMapPin },
    { path: '/donor/create-listing', label: 'Donate', Icon: FiPlusCircle, center: true },
    { path: '/volunteer/dashboard', label: 'Tasks', Icon: FiClipboard },
    { path: '/signup', label: 'Profile', Icon: FiUser }
  ];

  return (
    <nav className="mobile-only" style={{
      display: 'none', // Overridden by .mobile-only flex when < 640px
      justifyContent: 'space-around', 
      alignItems: 'center',
      background: '#161b22', 
      borderTop: '0.5px solid #21262d',
      padding: '8px 0 24px', 
      position: 'sticky', 
      bottom: 0,
      width: '100%',
      zIndex: 50
    }}>
      {tabs.map(tab => {
        const isActive = pathname === tab.path || (tab.path === '/volunteer/dashboard' && pathname === '/receiver/dashboard'); // naive routing mock
        return (
          <button 
            key={tab.path} 
            onClick={() => router.push(tab.path)}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              gap: '4px', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              color: isActive ? '#1D9E75' : '#8b949e' 
            }}
          >
            <tab.Icon size={tab.center ? 28 : 20} className={tab.center ? 'text-[#1D9E75]' : ''}/>
            <span style={{ fontSize: '10px', fontWeight: isActive ? '700' : '500' }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
