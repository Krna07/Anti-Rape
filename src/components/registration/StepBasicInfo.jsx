import { useState } from 'react';
import axios from 'axios';
import { API } from '../../context/AuthContext';

const inputStyle = (hasError) => ({
  background: 'var(--dark2)',
  border: `1px solid ${hasError ? 'var(--red)' : 'var(--border)'}`,
  borderRadius: '8px',
  color: 'var(--text)',
  padding: '10px 14px',
  fontSize: '14px',
  width: '100%',
  fontFamily: 'inherit',
  outline: 'none',
});

const labelStyle = {
  fontSize: '12px',
  color: 'var(--muted)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '5px',
  display: 'block',
};

const errorStyle = {
  fontSize: '12px',
  color: 'var(--red)',
  marginTop: '4px',
};

const fieldStyle = { display: 'flex', flexDirection: 'column', marginBottom: '14px' };

export default function StepBasicInfo({ formData, setFormData, setWizardToken, onNext, errors, setErrors }) {
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full name is required';
    if (!formData.email.trim()) errs.email = 'Email is required';
    if (!formData.password) errs.password = 'Password is required';
    else if (formData.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (!formData.phone.trim()) errs.phone = 'Phone number is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/auth/register`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: formData.role,
      });
      axios.defaults.headers.common['Authorization'] = 'Bearer ' + data.token;
      setWizardToken(data.token);
      onNext();
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (err.response?.status === 400 && msg.toLowerCase().includes('email')) {
        setErrors({ email: 'This email is already registered' });
      } else {
        setErrors({ general: msg || 'Registration failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Create your account</h2>
      <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>
        Step 1 — Basic information
      </p>

      {errors.general && (
        <div style={{ background: 'rgba(229,62,62,.1)', border: '1px solid var(--red)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: 'var(--red)' }}>
          {errors.general}
        </div>
      )}

      <div style={fieldStyle}>
        <label style={labelStyle}>Full Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={update('name')}
          placeholder="Your full name"
          style={inputStyle(!!errors.name)}
          autoComplete="name"
        />
        {errors.name && <span style={errorStyle}>{errors.name}</span>}
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={update('email')}
          placeholder="you@example.com"
          style={inputStyle(!!errors.email)}
          autoComplete="email"
        />
        {errors.email && <span style={errorStyle}>{errors.email}</span>}
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Password</label>
        <input
          type="password"
          value={formData.password}
          onChange={update('password')}
          placeholder="Min. 8 characters"
          style={inputStyle(!!errors.password)}
          autoComplete="new-password"
        />
        {errors.password && <span style={errorStyle}>{errors.password}</span>}
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Phone</label>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            fontSize: '14px', color: 'var(--muted)', pointerEvents: 'none',
          }}>+91</span>
          <input
            type="tel"
            value={formData.phone}
            onChange={update('phone')}
            placeholder="9876543210"
            style={{ ...inputStyle(!!errors.phone), paddingLeft: '44px' }}
            autoComplete="tel"
          />
        </div>
        {errors.phone && <span style={errorStyle}>{errors.phone}</span>}
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Role</label>
        <select
          value={formData.role}
          onChange={update('role')}
          style={inputStyle(false)}
        >
          <option value="user">User — needs help</option>
          <option value="rescuer">Rescuer — volunteer</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px',
          background: loading ? 'var(--border)' : 'var(--green)',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '15px',
          fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          marginTop: '6px',
          transition: 'background .2s',
        }}
      >
        {loading ? 'Creating account…' : 'Continue →'}
      </button>
    </form>
  );
}
