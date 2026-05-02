'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    // If no token, disconnect any existing socket and stop
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    // If a socket already exists for this token, don't reconnect
    if (socketRef.current && socketRef.current.auth?.token === token) {
      return;
    }

    // Disconnect previous socket if token changed
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    newSocket.on('connect', () => {
      console.log('🔌 Socket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      // Only mark offline for non-reconnecting disconnects
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        setConnected(false);
      }
    });

    newSocket.on('reconnect', () => {
      console.log('🔌 Socket reconnected');
      setConnected(true);
    });

    newSocket.on('connect_error', (err) => {
      console.log('Socket connection error:', err.message);
    });

    socketRef.current = newSocket;

    return () => {
      // Only cleanup on unmount (token === same), not on re-render
    };
  }, [token]); // Only depend on token string, not isAuthenticated (which changes every render)

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

export default SocketContext;
