import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { API } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { BellRing, CheckCircle2, Users, MapPin, AlertTriangle, BadgeAlert } from 'lucide-react';

function FalseReportModal({ alertId, onClose }) {
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await axios.post(`${API}/alerts/${alertId}/false-report`, { comment });
      toast.success('Reported. Feedback saved.');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setBusy(false); }
  };

  return (
    <div style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,.7)',
      display:'flex',alignItems:'center',justifyContent:'center',zIndex:200
    }}>
      <div className="card" style={{width:'100%',maxWidth:400,margin:20}}>
        <h3 style={{marginBottom:12,fontSize:16,display:'flex',alignItems:'center',gap:6}}><AlertTriangle size={18}/> Report False Alarm</h3>
        <p style={{color:'var(--muted)',fontSize:13,marginBottom:14}}>
          Leave feedback so others know what happened. This will be visible the next time this user triggers SOS.
        </p>
        <textarea
          placeholder="What happened? (optional, max 200 chars)"
          maxLength={200}
          value={comment}
          onChange={e => setComment(e.target.value)}
          style={{
            width:'100%',minHeight:90,background:'var(--dark2)',border:'1px solid var(--border)',
            borderRadius:8,color:'var(--text)',padding:'10px 14px',fontSize:13,
            fontFamily:'inherit',resize:'vertical',outline:'none'
          }}
        />
        <div style={{fontSize:11,color:'var(--muted)',textAlign:'right',marginBottom:14}}>
          {comment.length}/200
        </div>
        <div style={{display:'flex',gap:10}}>
          <button className="btn btn-danger" style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6}} onClick={submit} disabled={busy}>
            {busy ? 'Submitting…' : <><AlertTriangle size={16}/> Submit Report</>}
          </button>
          <button className="btn btn-ghost" style={{flex:1}} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const [alerts, setAlerts]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [reportId, setReportId]   = useState(null);
  const { alertUpdates, volunteer } = useSocket();
  const nav = useNavigate();

  useEffect(() => {
    axios.get(`${API}/alerts/active`)
      .then(r => setAlerts(r.data))
      .catch(() => toast.error('Failed to load alerts'))
      .finally(() => setLoading(false));
  }, []);

  const respond = async (alert) => {
    try {
      await axios.post(`${API}/alerts/${alert._id}/respond`);
      volunteer(alert._id);
      toast.success('You are now responding!');
      nav(`/alerts/${alert._id}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <div className="center"><div className="spinner"/></div>;

  return (
    <div>
      {reportId && (
        <FalseReportModal alertId={reportId} onClose={() => setReportId(null)} />
      )}

      <div className="sec-title" style={{display:'flex',alignItems:'center',gap:6}}><BellRing size={20}/> Active Alerts</div>
      {alerts.length === 0 ? (
        <div className="empty"><div className="ico"><CheckCircle2 size={40} color="var(--green)" strokeWidth={1}/></div><p>No active alerts. All clear!</p></div>
      ) : alerts.map(a => {
        const count = alertUpdates[a._id] ?? a.responders?.length ?? 0;
        const trust = a.victim?.trustScore ?? 100;
        return (
          <div key={a._id} className="alert-card urgent">
            <div className="alert-head">
              <div>
                <div className="alert-name" style={{display:'flex',alignItems:'center',gap:6}}><BadgeAlert size={16} color="var(--red)"/> {a.victimName || a.victim?.name}</div>
                <div className="alert-time">{new Date(a.createdAt).toLocaleTimeString()}</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
                <span className="badge badge-red">ACTIVE</span>
                <span className={`badge ${trust >= 70 ? 'badge-green' : trust >= 40 ? 'badge-orange' : 'badge-red'}`}
                  title="Victim trust score">
                  Trust: {trust}
                </span>
              </div>
            </div>
            <div style={{fontSize:13,color:'var(--muted)',marginBottom:6,display:'flex',alignItems:'center',gap:4}}>
              <MapPin size={14}/> {a.location?.coordinates?.[1]?.toFixed(4)}, {a.location?.coordinates?.[0]?.toFixed(4)}
            </div>
            <div style={{fontSize:13,marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
              <Users size={16}/> <strong style={{color:'var(--green)'}}>{count}</strong> rescuers responding
            </div>
            {a.responders?.slice(0,3).map((r,i) => (
              <span key={i} className="chip" style={{display:'inline-flex',alignItems:'center',gap:4}}><CheckCircle2 size={12}/> {r.name}</span>
            ))}
            <div className="alert-actions">
              <button className="btn btn-success" style={{fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',gap:4}} onClick={() => respond(a)}><Users size={14}/> I'm Helping</button>
              <button className="btn btn-primary" style={{fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',gap:4}} onClick={() => nav(`/alerts/${a._id}`)}><MapPin size={14}/> View Map</button>
              <button className="btn btn-ghost"   style={{fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',gap:4}} onClick={() => setReportId(a._id)}><AlertTriangle size={14}/> False Alarm</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
