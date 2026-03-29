import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API } from '../../context/AuthContext';

const inputStyle = (err) => ({
  background: 'var(--dark2)', border: `1px solid ${err ? 'var(--red)' : 'var(--border)'}`,
  borderRadius: 8, color: 'var(--text)', padding: '10px 14px',
  fontSize: 14, width: '100%', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
});
const labelStyle = { fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5, display: 'block' };
const errStyle   = { fontSize: 12, color: 'var(--red)', marginTop: 4 };
const field      = { display: 'flex', flexDirection: 'column', marginBottom: 14 };

function formatTime(s) {
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

export default function SimpleRegisterForm({ onComplete }) {
  const [step, setStep]         = useState(1);
  const [form, setForm]         = useState({ name:'', phone:'', email:'', password:'', urgentContact:'' });
  const [errors, setErrors]     = useState({});
  const [busy, setBusy]         = useState(false);
  const [token, setToken]       = useState(null);
  const [otp, setOtp]           = useState('');
  const [timeLeft, setTimeLeft] = useState(600);
  const [expired, setExpired]   = useState(false);
  const [resends, setResends]   = useState(0);
  const [otpErr, setOtpErr]     = useState('');
  const timerRef = useRef(null);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  // ── Step 1 submit ──────────────────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim())     errs.name     = 'Name is required';
    if (!form.phone.trim())    errs.phone    = 'Phone is required';
    if (!form.email.trim())    errs.email    = 'Email is required';
    if (form.password.length < 8) errs.password = 'Min 8 characters';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/auth/register`, {
        name: form.name, phone: `+91${form.phone}`, email: form.email, password: form.password, urgentContact: form.urgentContact
      });
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      setToken(data.token);
      setStep(2);
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (msg.toLowerCase().includes('email'))  setErrors({ email: 'Email already registered' });
      else if (msg.toLowerCase().includes('phone')) setErrors({ phone: 'Phone already registered' });
      else setErrors({ general: msg || 'Registration failed' });
    } finally { setBusy(false); }
  };

  // ── OTP send ───────────────────────────────────────────────────────────────
  const sendOTP = async () => {
    try {
      await axios.post(`${API}/auth/otp/send`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setTimeLeft(600); setExpired(false);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current); setExpired(true); return 0; }
          return t - 1;
        });
      }, 1000);
    } catch (err) { setOtpErr(err.response?.data?.message || 'Failed to send OTP'); }
  };

  useEffect(() => {
    if (step === 2 && token) sendOTP();
    return () => clearInterval(timerRef.current);
  }, [step]);

  // ── OTP verify ────────────────────────────────────────────────────────────
  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) { setOtpErr('Enter the 6-digit OTP'); return; }
    setOtpErr(''); setBusy(true);
    try {
      await axios.post(`${API}/auth/otp/verify`, { otp }, { headers: { Authorization: `Bearer ${token}` } });
      onComplete();
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (msg.toLowerCase().includes('expired')) { setExpired(true); setOtpErr('OTP expired'); }
      else setOtpErr('Incorrect OTP. Please try again.');
    } finally { setBusy(false); }
  };

  const handleResend = async () => {
    if (resends >= 3) return;
    setResends(r => r + 1);
    setOtp(''); setOtpErr('');
    await sendOTP();
  };

  if (step === 2) return (
    <form onSubmit={handleVerify} noValidate>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Verify your phone</h2>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
        OTP sent to +91{form.phone}
      </p>
      <div style={field}>
        <label style={labelStyle}>6-digit OTP</label>
        <input type="text" inputMode="numeric" maxLength={6} value={otp}
          onChange={e => { setOtp(e.target.value.replace(/\D/g,'')); setOtpErr(''); }}
          style={{ ...inputStyle(!!otpErr), fontSize: 22, letterSpacing: 8, textAlign: 'center', fontFamily: 'monospace' }}
          autoComplete="one-time-code" disabled={expired} />
        {otpErr && <span style={errStyle}>{otpErr}</span>}
      </div>
      <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 13, color: expired ? 'var(--red)' : 'var(--muted)' }}>
        {expired ? 'OTP expired' : <>Expires in <strong style={{ fontFamily: 'monospace' }}>{formatTime(timeLeft)}</strong></>}
      </div>
      {expired && (
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <button type="button" onClick={handleResend} disabled={resends >= 3}
            style={{ background: 'transparent', border: '1px solid var(--green)', color: resends >= 3 ? 'var(--muted)' : 'var(--green)', borderRadius: 6, padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: resends >= 3 ? 'not-allowed' : 'pointer' }}>
            {resends >= 3 ? 'Resend limit reached' : 'Resend OTP'}
          </button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" onClick={() => setStep(1)}
          style={{ flex: 1, padding: 12, background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          ← Back
        </button>
        <button type="submit" disabled={busy || expired || otp.length !== 6}
          style={{ flex: 2, padding: 12, background: (busy || expired || otp.length !== 6) ? 'var(--border)' : 'var(--green)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          {busy ? 'Verifying…' : 'Verify →'}
        </button>
      </div>
    </form>
  );

  return (
    <form onSubmit={handleRegister} noValidate>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Create account</h2>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>Join the rescue network</p>
      {errors.general && (
        <div style={{ background: 'rgba(229,62,62,.1)', border: '1px solid var(--red)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--red)' }}>
          {errors.general}
        </div>
      )}
      <div style={field}>
        <label style={labelStyle}>Full Name</label>
        <input type="text" value={form.name} onChange={set('name')} placeholder="Your name" style={inputStyle(!!errors.name)} />
        {errors.name && <span style={errStyle}>{errors.name}</span>}
      </div>
      <div style={field}>
        <label style={labelStyle}>Phone</label>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--muted)', pointerEvents: 'none' }}>+91</span>
          <input type="tel" value={form.phone} onChange={set('phone')} placeholder="9876543210"
            style={{ ...inputStyle(!!errors.phone), paddingLeft: 44 }} />
        </div>
        {errors.phone && <span style={errStyle}>{errors.phone}</span>}
      </div>
      <div style={field}>
        <label style={labelStyle}>Email</label>
        <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" style={inputStyle(!!errors.email)} />
        {errors.email && <span style={errStyle}>{errors.email}</span>}
      </div>
      <div style={field}>
        <label style={labelStyle}>Password</label>
        <input type="password" value={form.password} onChange={set('password')} placeholder="Min 8 characters" style={inputStyle(!!errors.password)} />
        {errors.password && <span style={errStyle}>{errors.password}</span>}
      </div>
      <div style={field}>
        <label style={labelStyle}>Urgent Emergency Contact (Optional)</label>
        <input type="text" value={form.urgentContact} onChange={set('urgentContact')} placeholder="e.g. Mom: 987654..." style={inputStyle(false)} />
      </div>
      <button type="submit" disabled={busy}
        style={{ width: '100%', padding: 12, background: busy ? 'var(--border)' : 'var(--green)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer' }}>
        {busy ? 'Creating account…' : 'Continue →'}
      </button>
    </form>
  );
}
