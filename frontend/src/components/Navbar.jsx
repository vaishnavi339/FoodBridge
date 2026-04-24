'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { notificationsAPI } from '@/services/api';
import { FiMenu, FiX, FiBell, FiLogOut, FiUser, FiMapPin, FiBox, FiHome, FiGrid, FiPlusCircle, FiSearch, FiSettings } from 'react-icons/fi';

export default function Navbar() {
  const { user, isAuthenticated, logout, isDonor, isReceiver, isAdmin, isVolunteer } = useAuth();
  const { connected } = useSocket();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handler = (notif) => {
      setNotifications(prev => [notif, ...prev.slice(0, 4)]);
      setUnreadCount(prev => prev + 1);
    };

    socket.on('notification', handler);
    return () => socket.off('notification', handler);
  }, [socket, isAuthenticated]);

  const fetchNotifications = async () => {
    try {
      const res = await notificationsAPI.getAll({ limit: 5 });
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      console.log('Failed to fetch notifications');
    }
  };

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) { /* ignore */ }
  };

  const getDashboardLink = () => {
    if (isAdmin) return '/admin';
    if (isDonor) return '/donor/dashboard';
    if (isReceiver) return '/receiver/dashboard';
    if (isVolunteer) return '/receiver/dashboard';
    return '/';
  };

  const navLinks = isAuthenticated ? [
    { href: getDashboardLink(), label: 'Dashboard', icon: <FiGrid size={18} /> },
    { href: '/map', label: 'Live Map', icon: <FiMapPin size={18} /> },
    ...(isDonor ? [{ href: '/donor/create-listing', label: 'Donate Food', icon: <FiPlusCircle size={18} /> }] : []),
    ...(isReceiver || isVolunteer ? [{ href: '/receiver/browse', label: 'Find Food', icon: <FiSearch size={18} /> }] : []),
  ] : [
    { href: '/', label: 'Home', icon: <FiHome size={18} /> },
    { href: '/map', label: 'Live Map', icon: <FiMapPin size={18} /> },
    { href: '/login', label: 'Login', icon: <FiUser size={18} /> },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 desktop-only ${scrolled ? 'glass shadow-2xl' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group" style={{ textDecoration: 'none' }}>
            <div className="w-9 h-9 gradient-bg rounded-xl flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform">
              🍽️
            </div>
            <span className="text-lg font-bold text-white hidden sm:block">
              Food<span className="gradient-text">Bridge</span>
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all duration-200"
                style={{ textDecoration: 'none' }}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Connection Status */}
            {isAuthenticated && (
              <div className="hidden sm:flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="text-xs text-slate-400">{connected ? 'Live' : 'Offline'}</span>
              </div>
            )}

            {/* Notifications */}
            {isAuthenticated && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) fetchNotifications(); }}
                  className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-all"
                >
                  <FiBell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#e24b4a] rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-12 w-[360px] bg-[#161b22] border border-[#21262d] rounded-[12px] shadow-2xl overflow-hidden animate-scale-in max-w-[calc(100vw-32px)]">
                    <div className="flex items-center justify-between p-4 border-b border-[#21262d]">
                      <h3 className="font-semibold text-sm">Notifications</h3>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-xs text-[#1D9E75] hover:text-[#34d399]">
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="p-4 text-sm text-slate-400 text-center">No notifications yet</p>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className={`flex items-start gap-3 p-3 border-b border-[#21262d] hover:bg-[#21262d]/50 transition-colors cursor-pointer`}>
                            <div className="w-8 h-8 rounded-full bg-[#1D9E75]/10 text-[#1D9E75] flex items-center justify-center shrink-0 mt-0.5">
                              <FiBell size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                               <p className="text-sm font-medium text-white truncate">{n.title}</p>
                               <p className="text-xs text-slate-400 mt-1 truncate">{n.message}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0 pt-1">
                              {!n.read && <div className="w-2 h-2 rounded-full bg-[#1D9E75]"></div>}
                              <span className="text-[10px] text-slate-500">2h ago</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <Link href="/notifications" className="block w-full text-center p-3 text-xs font-bold text-[#378ADD] hover:bg-[#21262d]/30 border-t border-[#21262d] transition-colors" onClick={() => setNotifOpen(false)}>
                      View all notifications
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href={getDashboardLink()}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all"
                  style={{ textDecoration: 'none' }}
                >
                  <div className="w-8 h-8 gradient-bg rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm font-medium text-slate-200">{user?.name?.split(' ')[0]}</span>
                </Link>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
                  title="Logout"
                >
                  <FiLogOut size={18} />
                </button>
              </div>
            ) : (
              <Link href="/register" className="btn-primary text-sm hidden md:inline-flex" style={{ textDecoration: 'none' }}>
                Get Started
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-all"
            >
              {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden glass border-t border-white/10 animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all"
                style={{ textDecoration: 'none' }}
                onClick={() => setMenuOpen(false)}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
            {isAuthenticated && (
              <button
                onClick={() => { logout(); setMenuOpen(false); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-400/10 transition-all w-full"
              >
                <FiLogOut size={18} />
                Logout
              </button>
            )}
            {!isAuthenticated && (
              <Link
                href="/register"
                className="block text-center btn-primary mt-2"
                style={{ textDecoration: 'none' }}
                onClick={() => setMenuOpen(false)}
              >
                Get Started
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
