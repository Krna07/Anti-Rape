import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RegistrationWizard from '../components/registration/RegistrationWizard';
import SimpleRegisterForm from '../components/registration/SimpleRegisterForm';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const { login, refreshUser } = useAuth();
  const nav = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(form.email, form.password);
      nav('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const handleRegistrationComplete = async () => {
    try { await refreshUser(); } catch (_) {}
    nav('/');
  };

  return (
    <div className="center">
      <div className="auth-wrap">
        <div className="auth-logo">
          <h1>ANTI-R</h1>
          <p>The next-generation emergency response network.</p>
        </div>
        <div className="auth-form-wrap">
          <div className="card" style={{border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.06)'}}>
            {mode === 'register' ? (
            <>
              <SimpleRegisterForm onComplete={handleRegistrationComplete} />
              <div className="switch" style={{marginTop:14}}>
                Already have an account?{' '}
                <button onClick={() => setMode('login')}>Sign In</button>
              </div>
            </>
          ) : (
            <>
              <form className="form" onSubmit={submit}>
                <div>
                  <h2>Welcome back</h2>
                  <p className="sub" style={{marginTop:4}}>Sign in to continue</p>
                </div>
                <div className="field">
                  <label>Email</label>
                  <input type="email" placeholder="you@example.com" value={form.email} onChange={e=>set('email',e.target.value)} required />
                </div>
                <div className="field">
                  <label>Password</label>
                  <input type="password" placeholder="••••••••" value={form.password} onChange={e=>set('password',e.target.value)} required />
                </div>
                <button className="btn btn-primary" type="submit" disabled={busy} style={{width:'100%',padding:'12px'}}>
                  {busy ? 'Please wait…' : 'Sign In'}
                </button>
              </form>
              <div className="switch" style={{marginTop:14}}>
                Don't have an account?{' '}
                <button onClick={() => setMode('register')}>Register</button>
              </div>
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
