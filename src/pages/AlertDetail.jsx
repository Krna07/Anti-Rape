import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { API } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { ArrowLeft, BellRing, ShieldCheck, AlertTriangle, ClipboardList, MapPin, Clock, Users, CheckCircle2, MessageSquare, BadgeAlert } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function AlertDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { alertUpdates, volunteer, markSafe } = useSocket();
  const nav = useNavigate();
  const [alert, setAlert]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [feedback, setFeedback]   = useState('');
  const [fbBusy, setFbBusy]       = useState(false);
  const [pastFeedback, setPast]   = useState([]);

  useEffect(() => {
    axios.get(`${API}/alerts/${id}`)
      .then(r => {
        setAlert(r.data);
        // Load past feedback for this victim
        const victimId = r.data.victim?._id || r.data.victim;
        if (victimId) {
          axios.get(`${API}/alerts/victim/${victimId}/feedback`)
            .then(fr => setPast(fr.data))
            .catch(() => {});
        }
      })
      .catch(() => { toast.error('Alert not found'); nav('/alerts'); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleVolunteer = async () => {
    try {
      await axios.post(`${API}/alerts/${id}/respond`);
      volunteer(id);
      toast.success('You are now responding!');
      setAlert(a => ({ ...a, responders: [...(a.responders || []), { name: user.name }] }));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleSafe = async () => {
    try {
      await axios.post(`${API}/alerts/${id}/resolve`);
      markSafe(id);
      toast.success('Marked safe!', { icon: <CheckCircle2 size={16}/> });
      nav('/');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const submitFeedback = async () => {
    if (!feedback.trim()) return;
    setFbBusy(true);
    try {
      await axios.post(`${API}/alerts/${id}/feedback`, { comment: feedback });
      toast.success('Feedback submitted!');
      setFeedback('');
      setAlert(a => ({
        ...a,
        feedback: [...(a.feedback || []), { reporterName: user.name, comment: feedback, createdAt: new Date() }]
      }));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setFbBusy(false); }
  };

  if (loading) return <div className="center"><div className="spinner"/></div>;
  if (!alert) return null;

  const [lng, lat] = alert.location?.coordinates || [0, 0];
  const count      = alertUpdates[id] ?? alert.responders?.length ?? 0;
  const isVictim   = (alert.victim?._id || alert.victim) === user?._id;
  const alreadyIn  = alert.responders?.some(r => (r.user?._id || r.user) === user?._id);
  const trust      = alert.victim?.trustScore ?? 100;

  return (
    <div>
      <button className="btn btn-ghost" style={{marginBottom:16,fontSize:13,display:'flex',alignItems:'center',gap:4}} onClick={() => nav('/alerts')}><ArrowLeft size={16}/> Back</button>

      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
        <h2 style={{fontSize:19,fontWeight:700,display:'flex',alignItems:'center',gap:6}}><BadgeAlert size={22} color="var(--red)"/> {alert.victimName || alert.victim?.name}</h2>
        <span className={`badge ${alert.status==='active'?'badge-red':'badge-green'}`}>
          {alert.status.toUpperCase()}
        </span>
      </div>

      {/* Trust score */}
      <div style={{marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontSize:13,color:'var(--muted)'}}>Victim trust score:</span>
        <span className={`badge ${trust>=70?'badge-green':trust>=40?'badge-orange':'badge-red'}`}>
          {trust}/100
        </span>
        {trust < 70 && (
          <span style={{fontSize:12,color:'var(--muted)',display:'flex',alignItems:'center',gap:4}}><AlertTriangle size={14}/> This user has prior false alarm reports</span>
        )}
      </div>

      {/* Past feedback from previous alerts */}
      {pastFeedback.length > 0 && (
        <div className="card" style={{marginBottom:16,borderColor:'var(--orange)'}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:8,color:'var(--orange)',display:'flex',alignItems:'center',gap:6}}>
            <ClipboardList size={16}/> Past Feedback on This User
          </div>
          {pastFeedback.slice(0,5).map((f,i) => (
            <div key={i} style={{
              padding:'8px 10px',background:'var(--dark2)',borderRadius:8,
              marginBottom:6,fontSize:13
            }}>
              <span style={{fontWeight:600}}>{f.reporterName}</span>
              <span style={{color:'var(--muted)',fontSize:11,marginLeft:8}}>
                {new Date(f.createdAt).toLocaleDateString()}
              </span>
              <p style={{color:'var(--text)',marginTop:4}}>{f.comment}</p>
            </div>
          ))}
        </div>
      )}

      {/* Map */}
      <div className="map-box" style={{height:280,marginBottom:16}}>
        <MapContainer center={[lat,lng]} zoom={15} style={{height:'100%',width:'100%'}}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
          <Marker position={[lat,lng]}>
            <Popup>🆘 {alert.victimName} — Emergency here!</Popup>
          </Marker>
        </MapContainer>
      </div>

      <div className="grid2" style={{marginBottom:16}}>
        <div className="card">
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:4}}>Location</div>
          <div style={{fontSize:13,display:'flex',alignItems:'center',gap:4}}><MapPin size={14}/> {lat.toFixed(5)}, {lng.toFixed(5)}</div>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>{new Date(alert.createdAt).toLocaleString()}</div>
          {alert.autoExpired && (
            <div style={{fontSize:12,color:'var(--orange)',marginTop:4,display:'flex',alignItems:'center',gap:4}}><Clock size={12}/> Auto-expired after 5 min</div>
          )}
        </div>
        <div className="card">
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:4}}>Responders</div>
          <div style={{fontSize:26,fontWeight:800,color:'var(--green)'}}>{count}</div>
          <div style={{fontSize:12,color:'var(--muted)'}}>on the way</div>
        </div>
      </div>

      {/* Responders */}
      {alert.responders?.length > 0 && (
        <div className="card" style={{marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:8,display:'flex',alignItems:'center',gap:6}}><Users size={16}/> Responding Heroes</div>
          {alert.responders.map((r,i) => <span key={i} className="chip" style={{display:'inline-flex',alignItems:'center',gap:4}}><CheckCircle2 size={14}/> {r.name}</span>)}
        </div>
      )}

      {/* Actions */}
      {alert.status === 'active' && (
        <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:20}}>
          {isVictim ? (
            <button className="btn btn-success" style={{padding:'12px 28px',fontSize:15,display:'flex',alignItems:'center',gap:6}} onClick={handleSafe}>
              <CheckCircle2 size={18}/> I'm Safe Now
            </button>
          ) : alreadyIn ? (
            <span className="badge badge-green" style={{padding:'10px 18px',fontSize:13,display:'inline-flex',alignItems:'center',gap:4}}><CheckCircle2 size={16}/> You're responding</span>
          ) : (
            <button className="btn btn-success" style={{padding:'12px 28px',fontSize:15,display:'flex',alignItems:'center',gap:6}} onClick={handleVolunteer}>
              <Users size={18}/> Volunteer to Help
            </button>
          )}
        </div>
      )}

      {/* Feedback section — visible to non-victims after they've responded or alert ended */}
      {!isVictim && (
        <div className="card" style={{marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:10,display:'flex',alignItems:'center',gap:6}}><MessageSquare size={16}/> Leave Feedback</div>
          <p style={{fontSize:12,color:'var(--muted)',marginBottom:10}}>
            Your feedback will be visible to other users when this person triggers SOS next time.
          </p>
          <textarea
            placeholder="Describe what you found (max 200 chars)"
            maxLength={200}
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            style={{
              width:'100%',minHeight:80,background:'var(--dark2)',border:'1px solid var(--border)',
              borderRadius:8,color:'var(--text)',padding:'10px 14px',fontSize:13,
              fontFamily:'inherit',resize:'vertical',outline:'none',marginBottom:8
            }}
          />
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:11,color:'var(--muted)'}}>{feedback.length}/200</span>
            <button className="btn btn-primary" style={{fontSize:13,display:'flex',alignItems:'center',gap:4}} onClick={submitFeedback} disabled={fbBusy || !feedback.trim()}>
              {fbBusy ? 'Submitting…' : <><MessageSquare size={14}/> Submit Feedback</>}
            </button>
          </div>
        </div>
      )}

      {/* Existing feedback on this alert */}
      {alert.feedback?.length > 0 && (
        <div className="card">
          <div style={{fontSize:14,fontWeight:700,marginBottom:10,display:'flex',alignItems:'center',gap:6}}><ClipboardList size={16}/> Feedback on This Alert</div>
          {alert.feedback.map((f,i) => (
            <div key={i} style={{
              padding:'8px 10px',background:'var(--dark2)',borderRadius:8,marginBottom:8,fontSize:13
            }}>
              <span style={{fontWeight:600}}>{f.reporterName}</span>
              <span style={{color:'var(--muted)',fontSize:11,marginLeft:8}}>
                {new Date(f.createdAt).toLocaleDateString()}
              </span>
              <p style={{color:'var(--text)',marginTop:4}}>{f.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
