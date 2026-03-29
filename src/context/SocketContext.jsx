import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const Ctx = createContext();

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const ref = useRef(null);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const [nearbyAlert, setNearbyAlert]   = useState(null);
  const [alertUpdates, setAlertUpdates] = useState({});
  const [helpRequests, setHelpRequests] = useState([]);   // incoming requests (victim sees)
  const [helpApproved, setHelpApproved] = useState({});   // keyed by alertId (responder sees)
  const [helpRejected, setHelpRejected] = useState({});   // keyed by alertId

  useEffect(() => {
    if (!token) { ref.current?.disconnect(); ref.current = null; return; }

    const socket = io(import.meta.env.VITE_SOCKET_URL, { auth: { token } });
    ref.current = socket;

    socket.on('connect', () => {
      const send = () => navigator.geolocation?.getCurrentPosition(
        p => socket.emit('UPDATE_LOCATION', { lat: p.coords.latitude, lng: p.coords.longitude })
      );
      send();
      socket._locInterval = setInterval(send, 30000);
    });

    socket.on('EMERGENCY_NEARBY', data => {
      setNearbyAlert(data);
      toast.error('🚨 Emergency nearby! Someone needs help.', { duration: 10000 });
    });

    socket.on('RESPONDER_JOINED', data => {
      toast.success(`✅ ${data.responderName} is on the way! (${data.total} total)`);
    });

    socket.on('ALERT_UPDATED', data => {
      setAlertUpdates(p => ({ ...p, [data.alertId]: data.responders }));
    });

    socket.on('ALERT_RESOLVED', data => {
      setNearbyAlert(p => p?.alertId === data.alertId ? null : p);
      toast.success('✅ Alert resolved!');
    });

    // Victim receives help request
    socket.on('HELP_REQUEST_RECEIVED', data => {
      setHelpRequests(prev => {
        const exists = prev.find(r => r.requesterId === data.requesterId && r.alertId === data.alertId);
        if (exists) return prev;
        return [...prev, data];
      });
      toast(`🤝 ${data.requesterName} wants to help (Trust: ${data.trustScore})`, { duration: 8000 });
    });

    // Responder gets approved — contains true coords + safe zone
    socket.on('HELP_APPROVED', data => {
      setHelpApproved(prev => ({ ...prev, [data.alertId]: data }));
      toast.success('✅ Your help request was approved!');
    });

    // Responder gets rejected
    socket.on('HELP_REJECTED', data => {
      setHelpRejected(prev => ({ ...prev, [data.alertId]: true }));
      toast.error('Your help request was declined.');
    });

    return () => {
      clearInterval(socket._locInterval);
      socket.disconnect();
    };
  }, [token]);

  const volunteer   = alertId => ref.current?.emit('VOLUNTEER_HELP', { alertId });
  const markSafe    = alertId => ref.current?.emit('MARK_SAFE',       { alertId });
  const cancelSOS   = alertId => ref.current?.emit('CANCEL_SOS',      { alertId });
  const dismiss     = ()      => setNearbyAlert(null);
  const requestHelp = alertId => ref.current?.emit('REQUEST_HELP',    { alertId });
  const approveHelp = (alertId, requesterId) => {
    ref.current?.emit('APPROVE_HELP', { alertId, requesterId });
    setHelpRequests(prev => prev.filter(r => !(r.alertId === alertId && r.requesterId === requesterId)));
  };
  const rejectHelp  = (alertId, requesterId) => {
    ref.current?.emit('REJECT_HELP',  { alertId, requesterId });
    setHelpRequests(prev => prev.filter(r => !(r.alertId === alertId && r.requesterId === requesterId)));
  };

  return (
    <Ctx.Provider value={{
      nearbyAlert, alertUpdates,
      helpRequests, helpApproved, helpRejected,
      volunteer, markSafe, cancelSOS, dismiss,
      requestHelp, approveHelp, rejectHelp,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSocket = () => useContext(Ctx);
