import { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BellRing, MapPin, Navigation, Handshake, Clock } from 'lucide-react';

export default function EmergencyBanner() {
  const { nearbyAlert, helpApproved, helpRejected, requestHelp, dismiss } = useSocket();
  const { user } = useAuth();
  const nav = useNavigate();
  const [requested, setRequested] = useState(false);

  if (!nearbyAlert) return null;

  const isVerified = (user?.verificationLevel ?? 0) >= 2;
  const alertId    = nearbyAlert.alertId?.toString();
  const approved   = helpApproved[alertId];
  const rejected   = helpRejected[alertId];

  const handleRequest = () => {
    requestHelp(alertId);
    setRequested(true);
  };

  const mapsLink = approved
    ? `https://www.google.com/maps/dir/?api=1&destination=${approved.location.lat},${approved.location.lng}`
    : null;

  return (
    <div className="em-banner">
      <div style={{ flex: 1 }}>
        <h3 style={{display:'flex',alignItems:'center',gap:6}}><BellRing size={18}/> EMERGENCY NEARBY</h3>
        {approved ? (
          <>
            <p style={{ fontSize: 13, marginTop: 4 }}>You're approved to help. Head to the location.</p>
            {approved.safeZone && (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,.8)', marginTop: 2, display:'flex',alignItems:'center',gap:4 }}>
                <MapPin size={14}/> Meet at: <strong>{approved.safeZone.name}</strong>
              </p>
            )}
          </>
        ) : rejected ? (
          <p style={{ fontSize: 13, marginTop: 4, color: 'rgba(255,200,200,.9)' }}>Your request was declined.</p>
        ) : requested ? (
          <p style={{ fontSize: 13, textTransform: 'uppercase', marginTop: 4, color: 'rgba(255,255,200,.9)', display:'flex',alignItems:'center',gap:4 }}><Clock size={14}/> Waiting for victim...</p>
        ) : (
          <p style={{ fontSize: 13, marginTop: 4 }}>
            {isVerified ? 'Someone needs help nearby.' : 'Verify your identity to respond to emergencies.'}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {approved && mapsLink && (
          <a href={mapsLink} target="_blank" rel="noreferrer"
            className="btn btn-success" style={{ fontSize: 13, textDecoration: 'none', padding: '8px 14px', display:'flex',alignItems:'center',gap:4 }}>
            <Navigation size={14}/> Navigate
          </a>
        )}
        {!approved && !rejected && !requested && isVerified && (
          <button className="btn btn-success" style={{ fontSize: 13, display:'flex',alignItems:'center',gap:4 }} onClick={handleRequest}>
            <Handshake size={14}/> Request to Help
          </button>
        )}
        <button className="btn btn-ghost"
          style={{ fontSize: 13, borderColor: 'rgba(255,255,255,.3)', color: '#fff' }}
          onClick={() => { dismiss(); setRequested(false); }}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
