import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useStore';

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socketInstance) {
    const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    const serverUrl = rawUrl.replace(/\/api\/v1\/?$/, '');

    const getToken = () => {
      const user = useAuthStore.getState().user;
      if (user?.token) return user.token;
      const userStr = sessionStorage.getItem('user');
      return userStr ? JSON.parse(userStr).token : null;
    };

    socketInstance = io(serverUrl, {
      auth: (cb) => {
        cb({ token: getToken() });
      },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('⚡ Socket.io live connection established:', socketInstance?.id);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('Socket.io connection warning:', err.message);
    });
  }

  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

