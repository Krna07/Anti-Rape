import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API } from '../../context/AuthContext';

const TIMER_START = 600;
const MAX_RESENDS = 3;

const inputStyle = (hasError) => ({
  background: 'var(--dark2)',
  border: `1px solid ${hasError ? 'var(--red)' : 'var(--border)'}`,
  borderRadius: '8px',
  color: 'var(--text)',
  padding: '10px 14px',
  fontSize: '22px',
  letterSpacing: '8px',
  width: '100%',
  fontFamily: 'monospace',
  outline: 'none',
  textAlign: 'center',
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

function maskPhone(phone) {
  // Show +91 prefix and last 4 digits, mask the middle
  const digits = phone.replace(/\D/g, '');
  const last4 = digits.slice(-4);
  const masked = 'XXXXXX';
  return `+91${masked}${last4}`;
}

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function StepPhoneOTP({ formData, wizardToken, onNext, onBack, errors, setErrors }) {
  const [otp, setOtp] = useState('');
  const [timeLeft, setTimeLeft] = useState(TIMER_START);
  const [expired, setExpired] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [sendLoading, setSendLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const timerRef = useRef(null);

  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${wizardToken}` },
  });

  const startTimer = () => {
    clearInterval(timerRef.current);
    setTimeLeft(TIMER_START);
    setExpired(false);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendOTP = async () => {
    setSendLoading(true);
    setErrors({});
    try {
      await axios.post(`${API}/auth/otp/send`, {}, authHeaders());
      startTimer();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP. Please try again.';
      setErrors({ general: msg });
    } finally {
      setSendLoading(false);
    }
  };

  // Send OTP on mount
  useEffect(() => {
    sendOTP();
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResend = async () => {
    if (resendDisabled) return;
    const newCount = resendCount + 1;
    setResendCount(newCount);
    if (newCount >= MAX_RESENDS) setResendDisabled(true);
    await sendOTP();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setErrors({ otp: 'Please enter the 6-digit OTP.' });
      return;
    }
    setErrors({});
    setSubmitLoading(true);
    try {
      await axios.post(`${API}/auth/otp/verify`, { otp }, authHeaders());
      onNext();
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (msg.toLowerCase().includes('expired')) {
        setExpired(true);
        clearInterval(timerRef.current);
        setTimeLeft(0);
        setErrors({ otp: 'OTP expired' });
      } else if (msg.toLowerCase().includes('resend limit')) {
        setResendDisabled(true);
        setErrors({ otp: 'Resend limit reached' });
      } else {
        setErrors({ otp: 'Incorrect OTP. Please try again.' });
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Verify your phone</h2>
      <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>
        Step 2 — Phone OTP verification
      </p>

      {sendLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px 0', fontSize: '14px' }}>
          Sending OTP…
        </div>
      ) : (
        <div style={{
          background: 'rgba(72,187,120,.08)',
          border: '1px solid var(--green)',
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '20px',
          fontSize: '13px',
          color: 'var(--green)',
        }}>
          OTP sent to {maskPhone(formData.phone || '')}
        </div>
      )}

      {errors.general && (
        <div style={{
          background: 'rgba(229,62,62,.1)',
          border: '1px solid var(--red)',
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '14px',
          fontSize: '13px',
          color: 'var(--red)',
        }}>
          {errors.general}
        </div>
      )}

      <div style={fieldStyle}>
        <label style={labelStyle}>Enter 6-digit OTP</label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={otp}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '');
            setOtp(val);
            if (errors.otp) setErrors({});
          }}
          placeholder="——————"
          style={inputStyle(!!errors.otp)}
          autoComplete="one-time-code"
          disabled={expired}
        />
        {errors.otp && <span style={errorStyle}>{errors.otp}</span>}
      </div>

      {/* Timer / Expired state */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        {!expired ? (
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            OTP expires in{' '}
            <span style={{ fontWeight: 700, color: timeLeft < 60 ? 'var(--red)' : 'var(--text)', fontFamily: 'monospace' }}>
              {formatTime(timeLeft)}
            </span>
          </span>
        ) : (
          <div>
            <span style={{ fontSize: '13px', color: 'var(--red)', fontWeight: 600 }}>OTP expired</span>
            <div style={{ marginTop: '10px' }}>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendDisabled || sendLoading}
                style={{
                  background: resendDisabled ? 'var(--border)' : 'transparent',
                  border: `1px solid ${resendDisabled ? 'var(--border)' : 'var(--green)'}`,
                  color: resendDisabled ? 'var(--muted)' : 'var(--green)',
                  borderRadius: '6px',
                  padding: '7px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: resendDisabled ? 'not-allowed' : 'pointer',
                }}
              >
                {sendLoading ? 'Sending…' : resendDisabled ? 'Resend limit reached' : 'Resend OTP'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            flex: '0 0 auto',
            padding: '12px 20px',
            background: 'transparent',
            color: 'var(--muted)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <button
          type="submit"
          disabled={submitLoading || expired || otp.length !== 6}
          style={{
            flex: 1,
            padding: '12px',
            background: (submitLoading || expired || otp.length !== 6) ? 'var(--border)' : 'var(--green)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 700,
            cursor: (submitLoading || expired || otp.length !== 6) ? 'not-allowed' : 'pointer',
            transition: 'background .2s',
          }}
        >
          {submitLoading ? 'Verifying…' : 'Verify OTP →'}
        </button>
      </div>
    </form>
  );
}
