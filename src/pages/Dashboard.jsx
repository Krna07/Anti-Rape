import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { useAuth, API } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import LongPressSOS from '../components/LongPressSOS';
import { Star, Heart, BellRing, Users, ShieldAlert, Ambulance, PhoneCall, TriangleAlert, ShieldCheck, User, X, Flame, Baby, ShieldPlus, Mic, Circle, Clock, CheckCircle2, XCircle } from 'lucide-react';

const EXPIRE_SECS = 5 * 60; // 5 minutes

const HelplinesModal = ({ onClose }) => (
  <div style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20
  }} onClick={onClose}>
    <div className="card" style={{ width: '100%', maxWidth: 400, padding: 24 }} onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}><PhoneCall size={18} /> Essential Helplines</h3>
        <button className="btn btn-ghost" style={{ padding: '6px', fontSize: 16, display: 'flex' }} onClick={onClose}><X size={18} /></button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '60vh', overflowY: 'auto' }}>
        {[
          { name: 'National Emergency', num: '112', icon: <BellRing size={18}/> },
          { name: 'Police', num: '100', icon: <ShieldAlert size={18}/> },
          { name: 'Ambulance', num: '102', icon: <Ambulance size={18}/> },
          { name: 'Fire Brigade', num: '101', icon: <Flame size={18}/> },
          { name: 'Women Helpline', num: '1091', icon: <ShieldPlus size={18}/> },
          { name: 'Child Helpline', num: '1098', icon: <Baby size={18}/> },
        ].map(h => (
          <a key={h.num} href={`tel:${h.num}`} className="action-tile" style={{ padding: 12 }}>
            <div className="tile-icon" style={{ width: 36, height: 36, fontSize: 18, background: 'var(--border)' }}>{h.icon}</div>
            <div className="tile-content">
              <div className="tile-title" style={{ fontSize: 14 }}>{h.name}</div>
              <div className="tile-sub" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 14 }}>{h.num}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const { user, setUser } = useAuth();
  const isVerified = (user?.verificationLevel ?? 0) >= 2;
  const { alertUpdates, cancelSOS: socketCancel, helpRequests, approveHelp, rejectHelp } = useSocket();
  const [busy, setBusy]             = useState(false);
  const [activeAlert, setActive]    = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [countdown, setCountdown]   = useState(EXPIRE_SECS);
  const [audioConsent, setAudioConsent] = useState(null); // null | true | false
  const [recorder, setRecorder]     = useState(null);
  const [showHelplines, setShowHelplines] = useState(false);
  const timerRef = useRef(null);

  // Countdown timer when alert is active
  useEffect(() => {
    if (activeAlert) {
      setCountdown(EXPIRE_SECS);
      timerRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            clearInterval(timerRef.current);
            setActive(null);
            toast.success('Your SOS alert expired after 5 minutes.', { icon: <Clock size={16}/> });
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [activeAlert?._id]);

  const responderCount = activeAlert
    ? (alertUpdates[activeAlert._id] ?? activeAlert.responders?.length ?? 0)
    : 0;

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const triggerSOS = (alertType = 'general') => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported');
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          // Capture screenshot
          let screenshotUrl;
          try {
            const canvas = await html2canvas(document.body, { useCORS: true, logging: false });
            const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.7));
            const fd = new FormData();
            fd.append('photo', blob, 'screenshot.jpg');
            fd.append('folder', 'evidence');
            const { data: up } = await axios.post(`${API}/kyc/upload`, fd);
            screenshotUrl = up.url;
          } catch (_) { /* screenshot optional */ }

          const { data } = await axios.post(`${API}/sos`, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            screenshotUrl,
            alertType
          });
          setActive(data.alert);
          toast.success(`🚨 SOS sent! ${data.notified} rescuers notified.`);
          setUser(u => ({ ...u, alertsTriggered: (u.alertsTriggered || 0) + 1 }));
          setAudioConsent(null); // prompt for audio
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to send SOS');
        } finally { setBusy(false); }
      },
      () => { toast.error('Location access denied'); setBusy(false); }
    );
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks = [];
      rec.ondataavailable = e => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        try {
          const fd = new FormData();
          fd.append('photo', blob, 'audio.webm');
          fd.append('folder', 'evidence-audio');
          const { data } = await axios.post(`${API}/kyc/upload`, fd);
          if (activeAlert) {
            await axios.patch(`${API}/alerts/${activeAlert._id}/evidence`, { audioUrl: data.url });
          }
        } catch (_) {}
      };
      rec.start();
      setRecorder(rec);
      setAudioConsent(true);
      toast('🎙 Audio recording started', { icon: '🎙' });
    } catch (_) {
      toast.error('Microphone access denied');
      setAudioConsent(false);
    }
  };

  const stopAudioRecording = () => {
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    setRecorder(null);
  };

  const markSafe = async () => {
    if (!activeAlert) return;
    stopAudioRecording();
    setActionBusy(true);
    try {
      await axios.post(`${API}/alerts/${activeAlert._id}/resolve`);
      toast.success('You are marked safe! Responders rewarded.');
      setActive(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setActionBusy(false); }
  };

  const cancelSOS = async () => {
    if (!activeAlert) return;
    stopAudioRecording();
    setActionBusy(true);
    try {
      await axios.post(`${API}/alerts/${activeAlert._id}/cancel`);
      socketCancel(activeAlert._id);
      toast('SOS cancelled.', { icon: <XCircle size={16} color="var(--red)"/> });
      setActive(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    } finally { setActionBusy(false); }
  };

  return (
    <div>
      <div style={{marginBottom:28, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <div>
          <h2 style={{fontSize:26,fontWeight:800, letterSpacing:'-0.5px'}}>Hey, {user?.name} <span>👋</span></h2>
          <p style={{color:'var(--muted)',fontSize:14,marginTop:6,display:'flex',alignItems:'center',gap:6}}>
            <span className={`badge ${user?.role==='rescuer'?'badge-blue':'badge-orange'}`} style={{display:'inline-flex',alignItems:'center',gap:4}}>
              {user?.role==='rescuer'? <><ShieldCheck size={14}/> Rescuer</> : <><User size={14}/> User</>}
            </span>
            <span>Trust Score:</span>
            <strong style={{color:user?.trustScore>60?'var(--green)' : 'var(--red)'}}>
              {user?.trustScore??100}
            </strong>
          </p>
        </div>
      </div>


      <div style={{textAlign:'center', padding: '10px 0'}}>
        {activeAlert ? (
          <div>
            <span className="badge badge-red" style={{fontSize:14,padding:'6px 18px', display:'inline-flex', alignItems:'center', gap:6}}>
              <TriangleAlert size={16}/> ALERT ACTIVE
            </span>
            <p style={{color:'var(--muted)',fontSize:13,margin:'10px 0'}}>
              Help is on the way. Tap <strong>Safe Now</strong> once you're okay,
              or <strong>Cancel</strong> if it was a mistake.
            </p>
            <p style={{fontSize:14,marginBottom:20,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              <Users size={16} color="var(--muted)"/> Responders:{' '}
              <strong style={{color:'var(--green)',fontSize:18}}>{responderCount}</strong>
            </p>
            {audioConsent === null && (
              <div style={{marginBottom:16,padding:'12px 16px',background:'var(--dark2)',borderRadius:8,border:'1px solid var(--border)'}}>
                <p style={{fontSize:13,color:'var(--text)',marginBottom:10,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Mic size={14}/> Record audio evidence?</p>
                <div style={{display:'flex',gap:8,justifyContent:'center'}}>
                  <button className="btn btn-primary" style={{fontSize:12,padding:'6px 14px'}} onClick={startAudioRecording}>Yes, record</button>
                  <button className="btn btn-ghost" style={{fontSize:12,padding:'6px 14px'}} onClick={()=>setAudioConsent(false)}>No thanks</button>
                </div>
              </div>
            )}
            {audioConsent === true && recorder && (
              <p style={{fontSize:12,color:'var(--red)',marginBottom:12,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                <Circle size={10} fill="currentColor" className="pulse-icon"/> Recording audio…
              </p>
            )}
            
            {/* INCOMING HELP REQUESTS UI */}
            {helpRequests.length > 0 && (
              <div style={{ marginTop: 20, textAlign: 'left' }}>
                <h4 style={{ marginBottom: 10, color: 'var(--orange)', display:'flex', alignItems:'center', gap:6 }}><Users size={16}/> Pending Help Requests</h4>
                {helpRequests.map(req => (
                  <div key={req.requesterId} style={{
                    padding: '12px', background: 'var(--dark2)', borderRadius: 8, 
                    border: '1px solid var(--border)', marginBottom: 8,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{req.requesterName}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>Trust Score: {req.trustScore}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-success" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => approveHelp(activeAlert._id, req.requesterId)}>
                        Approve
                      </button>
                      <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13, borderColor: 'var(--red)', color: 'var(--red)' }} onClick={() => rejectHelp(activeAlert._id, req.requesterId)}>
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{
              fontSize:13,color:countdown<60?'var(--red)':'var(--muted)',
              marginBottom:16, marginTop: 16, fontWeight:countdown<60?700:400,
              display:'flex',alignItems:'center',justifyContent:'center',gap:6
            }}>
              <Clock size={14}/> Auto-expires in <strong>{fmt(countdown)}</strong>
            </div>
            <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
              <button
                className="btn btn-success"
                style={{padding:'12px 28px',fontSize:15,display:'flex',alignItems:'center',gap:6}}
                onClick={markSafe}
                disabled={actionBusy}
              >
                {actionBusy ? 'Processing…' : <><CheckCircle2 size={18}/> Safe Now</>}
              </button>
              <button
                className="btn btn-ghost"
                style={{padding:'12px 28px',fontSize:15,borderColor:'var(--red)',color:'var(--red)',display:'flex',alignItems:'center',gap:6}}
                onClick={cancelSOS}
                disabled={actionBusy}
              >
                <XCircle size={18}/> Cancel SOS
              </button>
            </div>
          </div>
        ) : (
          <div className="sos-wrap">
            <p style={{color:'var(--muted)',fontSize:13}}>Hold in an emergency</p>
            <LongPressSOS onActivate={() => triggerSOS('general')} disabled={!isVerified} busy={busy} />
            {isVerified && (
              <p style={{color:'var(--muted)',fontSize:12,marginTop:8}}>
                Max 3 alerts/day · Nearby rescuers notified
              </p>
            )}

            {/* Quick Actions Panel */}
            <div style={{ marginTop: 20, width: '100%' }}>
              <h4 style={{ fontSize: 13, marginBottom: 20, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Quick Actions</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                
                <button 
                  onClick={() => triggerSOS('police')} 
                  disabled={!isVerified || busy}
                  className="action-minimal">
                  <div className="action-minimal-icon" style={{background:'rgba(33, 150, 243, 0.1)', color:'var(--secondary)'}}><ShieldAlert size={24}/></div>
                  <div className="action-minimal-lbl">Police</div>
                </button>

                <button 
                  onClick={() => triggerSOS('ambulance')} 
                  disabled={!isVerified || busy}
                  className="action-minimal">
                  <div className="action-minimal-icon" style={{background:'rgba(239, 68, 68, 0.1)', color:'var(--red)'}}><Ambulance size={24}/></div>
                  <div className="action-minimal-lbl">Ambulance</div>
                </button>

                <button onClick={() => setShowHelplines(true)} className="action-minimal">
                  <div className="action-minimal-icon" style={{background:'rgba(100, 116, 139, 0.1)', color:'var(--text)'}}><PhoneCall size={24}/></div>
                  <div className="action-minimal-lbl">Helplines</div>
                </button>

                <a href={`tel:${user?.urgentContact || ''}`} 
                   onClick={(e) => { if(!user?.urgentContact) { e.preventDefault(); toast('Please add an Urgent Contact in Profile first.', { icon: <TriangleAlert size={16}/> }); } }}
                   className="action-minimal">
                  <div className="action-minimal-icon" style={{background:'rgba(245, 158, 11, 0.1)', color:'var(--orange)'}}><TriangleAlert size={24}/></div>
                  <div className="action-minimal-lbl">Contact</div>
                </a>

              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 40, marginBottom: 32 }}>
        {[
          {icon:<Star size={22}/>, val:user?.heroPoints??0,      lbl:'Hero Points'},
          {icon:<Heart size={22}/>, val:user?.savedCount??0,       lbl:'Lives Saved'},
          {icon:<BellRing size={22}/>, val:user?.alertsTriggered??0,  lbl:'Alerts Sent'},
          {icon:<Users size={22}/>, val:user?.alertsResponded??0,  lbl:'Responded'},
        ].map(s => (
          <div className="stat-minimal" key={s.lbl}>
            <div className="stat-minimal-icon">{s.icon}</div>
            <div className="stat-minimal-val">{s.val}</div>
            <div className="stat-minimal-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      {showHelplines && <HelplinesModal onClose={() => setShowHelplines(false)} />}
    </div>
  );
}
