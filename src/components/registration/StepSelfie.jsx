import { useState } from 'react';
import CameraCapture from '../CameraCapture';
import { API } from '../../context/AuthContext';

const LIVENESS_INSTRUCTIONS = [
  'Look straight at the camera',
  'Ensure good lighting on your face',
  'Remove glasses if possible',
  'Keep a neutral expression',
];

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

export default function StepSelfie({ formData, setFormData, wizardToken, onNext, onBack }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const uploadWithRetry = async (blob) => {
    const delays = [1000, 2000];
    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        const fd = new FormData();
        fd.append('photo', blob, 'selfie.jpg');
        fd.append('folder', 'selfies');

        const res = await fetch(`${API}/kyc/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${wizardToken}` },
          body: fd,
        });

        if (!res.ok) throw new Error('Upload failed');

        const data = await res.json();
        return data.url;
      } catch (err) {
        if (attempt < delays.length) {
          await sleep(delays[attempt]);
        } else {
          throw err;
        }
      }
    }
  };

  const handleCapture = async (blob) => {
    setError(null);
    setUploading(true);
    try {
      const url = await uploadWithRetry(blob);
      setFormData((prev) => ({ ...prev, selfieUrl: url }));
      onNext();
    } catch {
      setError('Photo upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const instructionsText = LIVENESS_INSTRUCTIONS.join(' • ');

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Selfie Verification</h2>
      <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '16px' }}>
        Step 4 — Take a selfie to verify your identity
      </p>

      <div style={{
        background: 'var(--dark2)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '16px',
      }}>
        <p style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
          Instructions
        </p>
        <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {LIVENESS_INSTRUCTIONS.map((tip) => (
            <li key={tip} style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>{tip}</li>
          ))}
        </ul>
      </div>

      {error && (
        <div style={{
          background: 'rgba(229,62,62,.1)',
          border: '1px solid var(--red)',
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '14px',
          fontSize: '13px',
          color: 'var(--red)',
        }}>
          {error}
        </div>
      )}

      {uploading ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          padding: '40px 0',
          color: 'var(--muted)',
          fontSize: '14px',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid var(--border)',
            borderTopColor: 'var(--green)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          Uploading photo…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <CameraCapture onCapture={handleCapture} instructions={instructionsText} />
      )}

      <button
        type="button"
        onClick={onBack}
        style={{
          width: '100%',
          marginTop: '14px',
          padding: '12px',
          background: 'transparent',
          color: 'var(--muted)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          fontSize: '15px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        ← Back
      </button>
    </div>
  );
}
