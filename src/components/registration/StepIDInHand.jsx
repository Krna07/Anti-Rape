import { useState } from 'react';
import { createWorker } from 'tesseract.js';
import * as faceapi from '@vladmandic/face-api';
import CameraCapture from '../CameraCapture';
import { API } from '../../context/AuthContext';

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function uploadWithRetry(blob, wizardToken) {
  const delays = [1000, 2000];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const fd = new FormData();
      fd.append('photo', blob, 'id-in-hand.jpg');
      fd.append('folder', 'id-in-hand');
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
}

function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = reject;
    img.src = url;
  });
}

function urlToImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export default function StepIDInHand({ formData, setFormData, wizardToken, onNext, onBack, onComplete }) {
  const [processing, setProcessing] = useState(false);
  const [ocrStatus, setOcrStatus] = useState(null);   // null | 'ok' | 'warn' | 'unavailable'
  const [faceStatus, setFaceStatus] = useState(null); // null | 'ok' | 'warn' | 'unavailable'
  const [ocrMsg, setOcrMsg] = useState('');
  const [faceMsg, setFaceMsg] = useState('');
  const [uploadError, setUploadError] = useState(null);
  const [captured, setCaptured] = useState(false);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [manualReviewFlag, setManualReviewFlag] = useState(false);

  const idTypeLabel = formData.idType || 'ID';

  const handleCapture = async (blob) => {
    setProcessing(true);
    setUploadError(null);
    setOcrStatus(null);
    setFaceStatus(null);
    let localManualReview = false;

    // 1. Upload
    let idInHandUrl = '';
    try {
      idInHandUrl = await uploadWithRetry(blob, wizardToken);
      setFormData((prev) => ({ ...prev, idInHandUrl }));
    } catch {
      setUploadError('Photo upload failed. Please try again.');
      setProcessing(false);
      return;
    }

    // 2. OCR check
    try {
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(blob);
      await worker.terminate();
      const idName = (formData.idName || '').trim().toLowerCase();
      if (idName && text.toLowerCase().includes(idName)) {
        setOcrStatus('ok');
        setOcrMsg('Name found on ID.');
      } else {
        setOcrStatus('warn');
        setOcrMsg('Name not found on ID. Please ensure the ID is clearly visible.');
      }
    } catch {
      localManualReview = true;
      setOcrStatus('unavailable');
      setOcrMsg('Automated text check unavailable.');
    }

    // 3. Face match
    try {
      const modelsPath = '/models';
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(modelsPath),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelsPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelsPath),
      ]);

      const capturedImg = await blobToImage(blob);
      const selfieImg = await urlToImage(formData.selfieUrl);

      const detectionOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });

      const [capturedResult, selfieResult] = await Promise.all([
        faceapi.detectSingleFace(capturedImg, detectionOptions).withFaceLandmarks().withFaceDescriptor(),
        faceapi.detectSingleFace(selfieImg, detectionOptions).withFaceLandmarks().withFaceDescriptor(),
      ]);

      if (!capturedResult || !selfieResult) {
        localManualReview = true;
        setFaceStatus('unavailable');
        setFaceMsg('Face verification unavailable — could not detect faces.');
      } else {
        const distance = faceapi.euclideanDistance(capturedResult.descriptor, selfieResult.descriptor);
        if (distance > 0.6) {
          setFaceStatus('warn');
          setFaceMsg('Face match confidence is low. Your submission will be flagged for manual review.');
          localManualReview = true;
        } else {
          setFaceStatus('ok');
          setFaceMsg('Face match successful.');
        }
      }
    } catch {
      localManualReview = true;
      setFaceStatus('unavailable');
      setFaceMsg('Face verification unavailable.');
    }

    setManualReviewFlag(localManualReview);
    setCaptured(true);
    setProcessing(false);
  };

  const handleConsentChange = (e) => {
    setConsent(e.target.checked);
    if (e.target.checked) {
      setFormData((prev) => ({ ...prev, consentAt: new Date().toISOString() }));
    } else {
      setFormData((prev) => ({ ...prev, consentAt: null }));
    }
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/kyc/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${wizardToken}`,
        },
        body: JSON.stringify({ ...formData, manualReviewFlag }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Submission failed');
      }
      setSubmitted(true);
      onComplete();
    } catch (err) {
      setSubmitError(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Styles ──────────────────────────────────────────────────────────────────

  const s = {
    heading: { fontSize: '20px', fontWeight: 700, marginBottom: '6px' },
    sub: { color: 'var(--muted)', fontSize: '13px', marginBottom: '16px' },
    infoBox: {
      background: 'var(--dark2)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '16px',
      fontSize: '13px',
      color: 'var(--text)',
      lineHeight: 1.6,
    },
    statusRow: (type) => ({
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      padding: '10px 14px',
      borderRadius: '8px',
      marginBottom: '10px',
      fontSize: '13px',
      background: type === 'ok'
        ? 'rgba(72,187,120,.1)'
        : type === 'warn'
          ? 'rgba(237,137,54,.1)'
          : 'rgba(160,160,160,.08)',
      border: `1px solid ${type === 'ok' ? 'var(--green)' : type === 'warn' ? '#ed8936' : 'var(--border)'}`,
      color: type === 'ok' ? 'var(--green)' : type === 'warn' ? '#ed8936' : 'var(--muted)',
    }),
    errorBox: {
      background: 'rgba(229,62,62,.1)',
      border: '1px solid var(--red)',
      borderRadius: '8px',
      padding: '10px 14px',
      marginBottom: '14px',
      fontSize: '13px',
      color: 'var(--red)',
    },
    consentBox: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      background: 'var(--dark2)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '14px',
      marginBottom: '16px',
      marginTop: '8px',
    },
    consentText: { fontSize: '13px', color: 'var(--text)', lineHeight: 1.6 },
    btnSubmit: (disabled) => ({
      width: '100%',
      padding: '13px',
      background: disabled ? 'var(--border)' : 'var(--green)',
      color: disabled ? 'var(--muted)' : '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '15px',
      fontWeight: 700,
      cursor: disabled ? 'not-allowed' : 'pointer',
      marginBottom: '10px',
    }),
    btnBack: {
      width: '100%',
      padding: '12px',
      background: 'transparent',
      color: 'var(--muted)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      fontSize: '15px',
      fontWeight: 600,
      cursor: 'pointer',
    },
    spinner: {
      width: '32px',
      height: '32px',
      border: '3px solid var(--border)',
      borderTopColor: 'var(--green)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    },
    spinnerWrap: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      padding: '40px 0',
      color: 'var(--muted)',
      fontSize: '14px',
    },
    successBox: {
      background: 'rgba(72,187,120,.1)',
      border: '1px solid var(--green)',
      borderRadius: '10px',
      padding: '24px',
      textAlign: 'center',
      color: 'var(--green)',
      fontSize: '15px',
      fontWeight: 600,
      lineHeight: 1.6,
    },
  };

  if (submitted) {
    return (
      <div>
        <h2 style={s.heading}>KYC Submitted</h2>
        <div style={s.successBox}>
          ✓ Your KYC has been submitted for review.<br />
          You&apos;ll be notified once approved.
        </div>
      </div>
    );
  }

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <h2 style={s.heading}>ID in Hand</h2>
      <p style={s.sub}>Step 5 — Final verification</p>

      {/* Instructions */}
      <div style={s.infoBox}>
        Hold your <strong>{idTypeLabel}</strong> next to your face. Both your face and the ID must be clearly visible.
      </div>

      {/* Upload error */}
      {uploadError && <div style={s.errorBox}>{uploadError}</div>}

      {/* Camera or processing */}
      {processing ? (
        <div style={s.spinnerWrap}>
          <div style={s.spinner} />
          Running verification checks…
        </div>
      ) : !captured ? (
        <CameraCapture
          onCapture={handleCapture}
          instructions="Hold your ID next to your face and capture"
        />
      ) : null}

      {/* Check results */}
      {ocrStatus && (
        <div style={s.statusRow(ocrStatus)}>
          <span>{ocrStatus === 'ok' ? '✓' : ocrStatus === 'warn' ? '⚠' : 'ℹ'}</span>
          <span>OCR: {ocrMsg}</span>
        </div>
      )}
      {faceStatus && (
        <div style={s.statusRow(faceStatus)}>
          <span>{faceStatus === 'ok' ? '✓' : faceStatus === 'warn' ? '⚠' : 'ℹ'}</span>
          <span>Face match: {faceMsg}</span>
        </div>
      )}

      {/* Consent */}
      {captured && (
        <label style={s.consentBox}>
          <input
            type="checkbox"
            checked={consent}
            onChange={handleConsentChange}
            style={{ marginTop: '2px', accentColor: 'var(--green)', flexShrink: 0 }}
          />
          <span style={s.consentText}>
            I confirm the documents submitted are genuine. Submitting fake documents may result in
            permanent ban and legal action.
          </span>
        </label>
      )}

      {/* Submit error */}
      {submitError && <div style={s.errorBox}>{submitError}</div>}

      {/* Submit button */}
      {captured && (
        <button
          type="button"
          disabled={!consent || submitting}
          onClick={handleSubmit}
          style={s.btnSubmit(!consent || submitting)}
        >
          {submitting ? 'Submitting…' : 'Submit KYC'}
        </button>
      )}

      {/* Back */}
      <button type="button" onClick={onBack} style={s.btnBack}>
        ← Back
      </button>
    </div>
  );
}
