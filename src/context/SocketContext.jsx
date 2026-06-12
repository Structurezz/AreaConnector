import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user?._id) return;

    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '') ||
      'http://localhost:5001';

    let active = true;

    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      if (!active) return;
      setConnected(true);
      const estateId = user.estateId?._id || user.estateId;
      socket.emit('join', { userId: user._id, estateId });
    });

    socket.on('disconnect', () => {
      if (active) setConnected(false);
    });

    return () => {
      active = false;
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user?._id, user?.estateId]);

  const subscribe = (event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  };

  const emit = (event, data) => socketRef.current?.emit(event, data);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, subscribe, emit }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
