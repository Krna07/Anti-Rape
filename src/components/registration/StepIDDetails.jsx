import { useState } from 'react';
import axios from 'axios';
import { API } from '../../context/AuthContext';

const ID_PATTERNS = {
  aadhaar: /^\d{12}$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
  voter_id: /^[A-Z]{3}[0-9]{7}$/,
  passport: /^[A-Z][1-9][0-9]{7}$/,
  driving_license: /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{11}$/,
};

const ID_LABELS = {
  aadhaar: 'Aadhaar',
  pan: 'PAN Card',
  voter_id: 'Voter ID',
  passport: 'Passport',
  driving_license: 'Driving License',
};

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
  boxSizing: 'border-box',
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

export default function StepIDDetails({ formData, setFormData, wizardToken, onNext, onBack, errors, setErrors }) {
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // { accountName, idName }

  const update = (field) => (e) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const updateUpper = (field) => (e) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value.toUpperCase() }));

  const needsExpiry = formData.idType === 'passport' || formData.idType === 'driving_license';

  const validate = () => {
    const errs = {};
    if (!formData.idType) errs.idType = 'Please select an ID type';
    if (!formData.idNumber.trim()) {
      errs.idNumber = 'ID number is required';
    } else if (formData.idType && ID_PATTERNS[formData.idType]) {
      if (!ID_PATTERNS[formData.idType].test(formData.idNumber)) {
        errs.idNumber = `Invalid ${ID_LABELS[formData.idType]} number format`;
      }
    }
    if (!formData.dob) errs.dob = 'Date of birth is required';
    if (!formData.idName.trim()) errs.idName = 'Name as on ID is required';
    if (needsExpiry && !formData.expiryDate) errs.expiryDate = 'Expiry date is required';
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
      await axios.post(
        `${API}/kyc/id-check`,
        {
          idType: formData.idType,
          idNumber: formData.idNumber,
          dob: formData.dob,
          idName: formData.idName,
          expiryDate: formData.expiryDate || undefined,
        },
        { headers: { Authorization: `Bearer ${wizardToken}` } }
      );

      const accountName = (formData.name || '').trim().toLowerCase();
      const idName = (formData.idName || '').trim().toLowerCase();

      if (accountName && idName && accountName !== idName) {
        setModal({ accountName: formData.name.trim(), idName: formData.idName.trim() });
      } else {
        onNext();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'ID verification failed. Please try again.';
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} noValidate>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>ID Verification</h2>
        <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>
          Step 3 — Verify your identity document
        </p>

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
          <label style={labelStyle}>ID Type</label>
          <select
            value={formData.idType}
            onChange={update('idType')}
            style={inputStyle(!!errors.idType)}
          >
            <option value="">Select ID type…</option>
            {Object.entries(ID_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          {errors.idType && <span style={errorStyle}>{errors.idType}</span>}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>ID Number</label>
          <input
            type="text"
            value={formData.idNumber}
            onChange={updateUpper('idNumber')}
            placeholder={formData.idType ? `Enter ${ID_LABELS[formData.idType] || 'ID'} number` : 'Select ID type first'}
            style={inputStyle(!!errors.idNumber)}
            autoComplete="off"
          />
          {errors.idNumber && <span style={errorStyle}>{errors.idNumber}</span>}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Date of Birth</label>
          <input
            type="date"
            value={formData.dob}
            onChange={update('dob')}
            style={inputStyle(!!errors.dob)}
          />
          {errors.dob && <span style={errorStyle}>{errors.dob}</span>}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Name as on ID</label>
          <input
            type="text"
            value={formData.idName}
            onChange={update('idName')}
            placeholder="Exactly as printed on your ID"
            style={inputStyle(!!errors.idName)}
            autoComplete="name"
          />
          {errors.idName && <span style={errorStyle}>{errors.idName}</span>}
        </div>

        {needsExpiry && (
          <div style={fieldStyle}>
            <label style={labelStyle}>Expiry Date</label>
            <input
              type="date"
              value={formData.expiryDate}
              onChange={update('expiryDate')}
              style={inputStyle(!!errors.expiryDate)}
            />
            {errors.expiryDate && <span style={errorStyle}>{errors.expiryDate}</span>}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              flex: 1,
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
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 2,
              padding: '12px',
              background: loading ? 'var(--border)' : 'var(--green)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background .2s',
            }}
          >
            {loading ? 'Verifying…' : 'Continue →'}
          </button>
        </div>
      </form>

      {modal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
        }}>
          <div style={{
            background: 'var(--dark2)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Name Mismatch</h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '20px' }}>
              Your account name is <strong style={{ color: 'var(--text)' }}>"{modal.accountName}"</strong> but
              your ID shows <strong style={{ color: 'var(--text)' }}>"{modal.idName}"</strong>. Do you want to continue?
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setModal(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'transparent',
                  color: 'var(--muted)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Go Back
              </button>
              <button
                onClick={() => { setModal(null); onNext(); }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'var(--green)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
