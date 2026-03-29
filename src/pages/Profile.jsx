import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API, useAuth } from '../context/AuthContext';
import { ShieldCheck, User, Star, Heart, BellRing, Users, ClipboardList } from 'lucide-react';

const ID_TYPES = ['aadhaar','pan','voter_id','passport','driving_license'];
const ID_LABELS = { aadhaar:'Aadhaar', pan:'PAN Card', voter_id:'Voter ID', passport:'Passport', driving_license:'Driving License' };

function KYCSection({ user, refreshUser }) {
  const status = user?.verification?.status || 'none';
  const [form, setForm] = useState({ idType:'', idNumber:'', dob:'', idName:'', selfieUrl:'', idInHandUrl:'', consentAt:'' });
  const [busy, setBusy] = useState(false);
  const [selfieFile, setSelfieFile] = useState(null);
  const [idFile, setIdFile] = useState(null);

  const uploadFile = async (file, folder) => {
    const fd = new FormData();
    fd.append('photo', file);
    fd.append('folder', folder);
    const { data } = await axios.post(`${API}/kyc/upload`, fd);
    return data.url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.idType || !form.idNumber || !form.dob || !form.idName) {
      toast.error('Please fill all required fields'); return;
    }
    if (!selfieFile || !idFile) { toast.error('Please upload both photos'); return; }
    setBusy(true);
    try {
      const [selfieUrl, idInHandUrl] = await Promise.all([
        uploadFile(selfieFile, 'selfies'),
        uploadFile(idFile, 'id-in-hand'),
      ]);
      await axios.post(`${API}/kyc/submit`, {
        ...form, selfieUrl, idInHandUrl, consentAt: new Date().toISOString()
      });
      toast.success('KYC submitted for review!');
      if (refreshUser) await refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally { setBusy(false); }
  };

  const inp = { background:'var(--dark2)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', padding:'9px 12px', fontSize:13, width:'100%', fontFamily:'inherit', outline:'none', boxSizing:'border-box' };

  const statusBadge = {
    none:     { cls:'badge-orange', label:'Not Verified' },
    pending:  { cls:'badge-blue',   label:'⏳ Pending Review' },
    approved: { cls:'badge-green',  label:'✅ Verified' },
    rejected: { cls:'badge-red',    label:'❌ Rejected' },
    locked:   { cls:'badge-red',    label:'🔒 Locked' },
    banned:   { cls:'badge-red',    label:'🚫 Banned' },
  }[status] || { cls:'badge-orange', label:'Not Verified' };

  return (
    <div className="card" style={{ marginBottom: 22 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ fontSize:15, fontWeight:700 }}>🪪 Identity Verification</div>
        <span className={`badge ${statusBadge.cls}`}>{statusBadge.label}</span>
      </div>

      {status === 'approved' && (
        <p style={{ fontSize:13, color:'var(--green)' }}>Your identity is verified. You have full access.</p>
      )}
      {status === 'pending' && (
        <p style={{ fontSize:13, color:'var(--muted)' }}>Your documents are under review. You'll be notified once approved.</p>
      )}
      {(status === 'locked' || status === 'banned') && (
        <p style={{ fontSize:13, color:'var(--red)' }}>
          {status === 'banned' ? 'Your account has been permanently suspended.' : 'Your account is locked. Please contact support.'}
        </p>
      )}
      {status === 'rejected' && user?.verification?.rejectionReason && (
        <div style={{ background:'rgba(229,62,62,.1)', border:'1px solid var(--red)', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:13, color:'var(--red)' }}>
          Rejection reason: {user.verification.rejectionReason}
        </div>
      )}

      {(status === 'none' || status === 'rejected') && (
        <form onSubmit={handleSubmit}>
          <p style={{ fontSize:13, color:'var(--muted)', marginBottom:14 }}>
            Upload your government ID and a selfie to unlock SOS and emergency response features.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <select value={form.idType} onChange={e=>setForm(f=>({...f,idType:e.target.value}))} style={inp}>
              <option value="">Select ID type…</option>
              {ID_TYPES.map(t => <option key={t} value={t}>{ID_LABELS[t]}</option>)}
            </select>
            <input type="text" placeholder="ID Number" value={form.idNumber}
              onChange={e=>setForm(f=>({...f,idNumber:e.target.value.toUpperCase()}))} style={inp} />
            <input type="date" value={form.dob} onChange={e=>setForm(f=>({...f,dob:e.target.value}))} style={inp} />
            <input type="text" placeholder="Name as on ID" value={form.idName}
              onChange={e=>setForm(f=>({...f,idName:e.target.value}))} style={inp} />
            <div>
              <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:4 }}>Selfie photo</label>
              <input type="file" accept="image/*" onChange={e=>setSelfieFile(e.target.files[0])} style={{ fontSize:13, color:'var(--text)' }} />
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:4 }}>ID document photo</label>
              <input type="file" accept="image/*" onChange={e=>setIdFile(e.target.files[0])} style={{ fontSize:13, color:'var(--text)' }} />
            </div>
            <button type="submit" disabled={busy}
              style={{ padding:'11px', background: busy ? 'var(--border)' : 'var(--green)', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor: busy ? 'not-allowed' : 'pointer' }}>
              {busy ? 'Submitting…' : '🪪 Submit for Verification'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function ContactSection({ user, refreshUser }) {
  const [contact, setContact] = useState(user?.urgentContact || '');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setContact(user?.urgentContact || ''); }, [user?.urgentContact]);

  const handleUpdate = async () => {
    setBusy(true);
    try {
      await axios.patch(`${API}/users/profile`, { urgentContact: contact });
      toast.success('Emergency contact updated!');
      if (refreshUser) refreshUser();
    } catch (err) {
      toast.error('Failed to update contact');
    } finally { setBusy(false); }
  };

  const inp = { background:'var(--dark2)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', padding:'9px 12px', fontSize:13, flex:1, fontFamily:'inherit', outline:'none' };

  return (
    <div className="card" style={{ marginBottom: 22 }}>
      <div style={{ fontSize:15, fontWeight:700, marginBottom:12 }}>🆘 Urgent Emergency Contact</div>
      <p style={{ fontSize:13, color:'var(--muted)', marginBottom:14 }}>
        This number is called instantly when you tap the Urgent Contact button during an emergency.
      </p>
      <div style={{ display:'flex', gap:10 }}>
        <input type="tel" placeholder="e.g. Mom: +91 98765..." value={contact} onChange={e => setContact(e.target.value)} style={inp} />
        <button onClick={handleUpdate} disabled={busy || contact === (user?.urgentContact || '')} className="btn btn-primary" style={{ padding:'9px 16px', fontSize:13 }}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function OTPSection({ user, refreshUser }) {
  const [step, setStep]       = useState('idle'); // idle | sent | verified
  const [otp, setOtp]         = useState('');
  const [demoOtp, setDemoOtp] = useState('');   // shown in popup
  const [showPopup, setShowPopup] = useState(false);
  const [busy, setBusy]       = useState(false);
  const [countdown, setCount] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const isVerified = user?.verificationLevel >= 1;

  const sendOTP = async () => {
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/auth/otp/send`);
      setDemoOtp(data.otp);
      setShowPopup(true);
      setStep('sent');
      setCount(60);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate OTP');
    } finally { setBusy(false); }
  };

  const verifyOTP = async () => {
    if (!otp.trim()) return toast.error('Enter the OTP');
    setBusy(true);
    try {
      await axios.post(`${API}/auth/otp/verify`, { otp });
      toast.success('✅ Account verified!');
      setStep('verified');
      if (refreshUser) await refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally { setBusy(false); }
  };

  if (isVerified) {
    return (
      <div className="card" style={{ marginBottom:22, borderColor:'var(--green)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:22 }}>✅</span>
          <div>
            <div style={{ fontSize:15, fontWeight:700 }}>Account Verified</div>
            <div style={{ fontSize:13, color:'var(--green)', marginTop:2 }}>Full access unlocked</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* OTP Popup */}
      {showPopup && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,.75)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:300
        }}>
          <div className="card" style={{ width:'100%', maxWidth:340, margin:20, textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🔐</div>
            <h3 style={{ fontSize:17, marginBottom:6 }}>Your OTP Code</h3>
            <p style={{ fontSize:13, color:'var(--muted)', marginBottom:16 }}>
              This is your demo OTP. Copy it and enter below.
            </p>
            <div style={{
              background:'var(--dark2)', border:'1px solid var(--green)',
              borderRadius:10, padding:'18px 24px', marginBottom:18
            }}>
              <span style={{ fontSize:42, fontWeight:900, letterSpacing:10, color:'var(--green)', fontFamily:'monospace' }}>
                {demoOtp}
              </span>
            </div>
            <button className="btn btn-primary" style={{ width:'100%' }}
              onClick={() => { setOtp(demoOtp); setShowPopup(false); }}>
              Auto-fill & Close
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom:22 }}>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:8 }}>🔐 Verify Account</div>
        <p style={{ fontSize:13, color:'var(--muted)', marginBottom:14 }}>
          Verify your account to unlock full features. A demo OTP will appear on screen.
        </p>

        {step === 'idle' && (
          <button className="btn btn-primary" style={{ fontSize:13 }} onClick={sendOTP} disabled={busy}>
            {busy ? 'Generating…' : '🔐 Generate OTP'}
          </button>
        )}

        {step === 'sent' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ display:'flex', gap:10 }}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                style={{
                  background:'var(--dark2)', border:'1px solid var(--border)',
                  borderRadius:8, color:'var(--text)', padding:'10px 14px',
                  fontSize:20, letterSpacing:8, flex:1, fontFamily:'monospace',
                  outline:'none', textAlign:'center'
                }}
              />
              <button className="btn btn-success" style={{ fontSize:13 }}
                onClick={verifyOTP} disabled={busy || otp.length < 6}>
                {busy ? 'Verifying…' : '✅ Verify'}
              </button>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <button className="btn btn-ghost" style={{ fontSize:12, padding:'4px 10px' }}
                onClick={() => setShowPopup(true)}>
                👁 Show OTP again
              </button>
              <button className="btn btn-ghost" style={{ fontSize:12, padding:'4px 10px' }}
                onClick={sendOTP} disabled={busy || countdown > 0}>
                {countdown > 0 ? `Resend in ${countdown}s` : '🔄 New OTP'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState('triggered');
  const [history, setHistory] = useState({ triggered:[], responded:[] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/alerts/history/me`)
      .then(r => setHistory(r.data))
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="profile-head" style={{display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', marginBottom:32, marginTop:10}}>
        <div className="avatar" style={{width: 90, height: 90, fontSize: 36, marginBottom: 16}}>{user?.name?.charAt(0).toUpperCase()}</div>
        <div>
          <h2 style={{fontSize:26,fontWeight:800, letterSpacing:'-0.5px'}}>{user?.name}</h2>
          <p style={{color:'var(--muted)',fontSize:14,marginTop:6}}>
            {user?.email} • {user?.phone}
          </p>
          <div style={{marginTop:12, display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap'}}>
            <span className={`badge ${user?.role==='rescuer'?'badge-blue':'badge-orange'}`} style={{fontSize:13, padding:'4px 12px', display:'inline-flex', alignItems:'center', gap:4}}>
              {user?.role==='rescuer' ? <><ShieldCheck size={14}/> Confirmed Rescuer</> : <><User size={14}/> Standard User</>}
            </span>
            <span className="badge badge-green" style={{fontSize:13, padding:'4px 12px'}}>Trust: {user?.trustScore??100}</span>
          </div>
        </div>
      </div>

      <div className="grid2" style={{marginBottom:22}}>
        {[
          {icon:<Star size={22}/>,val:user?.heroPoints??0,lbl:'Hero Points',color:'var(--orange)'},
          {icon:<Heart size={22}/>,val:user?.savedCount??0,lbl:'Lives Saved',color:'var(--secondary)'},
          {icon:<BellRing size={22}/>,val:user?.alertsTriggered??0,lbl:'Alerts Sent',color:'var(--text)'},
          {icon:<Users size={22}/>,val:user?.alertsResponded??0,lbl:'Responded',color:'var(--green)'},
        ].map(s => (
          <div className="stat-minimal" key={s.lbl} style={{padding:'20px 10px'}}>
            <div className="stat-minimal-icon" style={{color: s.color}}>{s.icon}</div>
            <div className="stat-minimal-val">{s.val}</div>
            <div className="stat-minimal-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      <ContactSection user={user} refreshUser={refreshUser} />

      <OTPSection user={user} refreshUser={refreshUser} />

      <KYCSection user={user} refreshUser={refreshUser} />

      <div className="sec-title" style={{display:'flex', alignItems:'center', gap:6}}><ClipboardList size={18}/> Alert History</div>
      <div className="tabs">
        <button className={`tab${tab==='triggered'?' active':''}`} onClick={()=>setTab('triggered')}>
          Sent ({history.triggered?.length??0})
        </button>
        <button className={`tab${tab==='responded'?' active':''}`} onClick={()=>setTab('responded')}>
          Responded ({history.responded?.length??0})
        </button>
      </div>

      {loading ? <div className="spinner" style={{marginTop:20}}/> : (
        (history[tab]??[]).length === 0 ? (
          <div className="empty">
            <div className="ico"><BellRing size={40} color="var(--muted)" strokeWidth={1} /></div>
            <p>No {tab==='triggered'?'alerts sent':'alerts responded to'} yet.</p>
          </div>
        ) : (history[tab]??[]).map(a => (
          <div key={a._id} className="hist-item">
            <div>
              <div style={{fontWeight:600,fontSize:13}}>
                {tab==='triggered'?'🚨 SOS Alert':`🤝 Helped: ${a.victimName}`}
              </div>
              <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{new Date(a.createdAt).toLocaleString()}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <span className={`badge ${a.status==='active'?'badge-red':a.status==='resolved'?'badge-green':'badge-orange'}`}>
                {a.status}
              </span>
              {tab==='triggered' && (
                <div style={{fontSize:12,color:'var(--muted)',marginTop:3}}>{a.responders?.length??0} responders</div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
