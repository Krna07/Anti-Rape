import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth, API } from '../context/AuthContext';

function maskId(str) {
  if (!str || str.length === 0) return '****';
  const visible = str.slice(-4);
  const stars = '*'.repeat(Math.max(0, str.length - 4));
  return stars + visible;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function KYCAdminPanel() {
  const { user, token } = useAuth();
  const nav = useNavigate();

  const [pending, setPending]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [selected, setSelected]     = useState(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason]         = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (user && user.role !== 'admin') {
      nav('/');
    }
  }, [user, nav]);

  const fetchPending = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get(`${API}/kyc/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPending(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pending submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') fetchPending();
  }, [user]);

  const selectRow = (item) => {
    if (selected?._id === item._id) {
      setSelected(null);
      setRejectMode(false);
      setReason('');
      setActionError('');
    } else {
      setSelected(item);
      setRejectMode(false);
      setReason('');
      setActionError('');
    }
  };

  const handleApprove = async () => {
    if (!selected) return;
    setActionBusy(true);
    setActionError('');
    try {
      await axios.post(
        `${API}/kyc/review/${selected._id}`,
        { action: 'approve' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelected(null);
      await fetchPending();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Approval failed.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleReject = async () => {
    if (!selected || !reason.trim()) return;
    setActionBusy(true);
    setActionError('');
    try {
      await axios.post(
        `${API}/kyc/review/${selected._id}`,
        { action: 'reject', reason: reason.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelected(null);
      setRejectMode(false);
      setReason('');
      await fetchPending();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Rejection failed.');
    } finally {
      setActionBusy(false);
    }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>KYC Review Panel</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
            Pending submissions awaiting admin review
          </p>
        </div>
        <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={fetchPending} disabled={loading}>
          🔄 Refresh
        </button>
      </div>

      {loading && (
        <div className="center" style={{ minHeight: 200 }}>
          <div className="spinner" />
        </div>
      )}

      {!loading && error && (
        <div style={{
          background: 'rgba(229,62,62,.1)', border: '1px solid var(--red)',
          borderRadius: 10, padding: '14px 18px', color: '#fc8181', marginBottom: 16
        }}>
          ⚠ {error}
        </div>
      )}

      {!loading && !error && pending.length === 0 && (
        <div className="empty">
          <div className="ico">✅</div>
          <p>No pending KYC submissions</p>
        </div>
      )}

      {!loading && pending.length > 0 && (
        <div>
          {pending.map(item => {
            const v = item.verification || {};
            const isSelected = selected?._id === item._id;
            const nameMismatch = item.name && v.idNameAsEntered &&
              item.name.trim().toLowerCase() !== v.idNameAsEntered.trim().toLowerCase();

            return (
              <div
                key={item._id}
                style={{
                  background: 'var(--card)',
                  border: `1px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}`,
                  borderRadius: 12,
                  marginBottom: 12,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'border-color .2s'
                }}
              >
                {/* Row header */}
                <div
                  onClick={() => selectRow(item)}
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{item.name}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>{item.email}</div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', minWidth: 100 }}>
                    📅 {fmtDate(v.submittedAt)}
                  </div>
                  <div style={{ fontSize: 13, minWidth: 100 }}>
                    <span className="badge badge-blue">{v.idType || '—'}</span>
                  </div>
                  {v.manualReviewFlag && (
                    <span className="badge badge-orange">⚠ Manual Review</span>
                  )}
                  <div style={{ color: 'var(--muted)', fontSize: 18 }}>
                    {isSelected ? '▲' : '▼'}
                  </div>
                </div>

                {/* Expanded detail */}
                {isSelected && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '18px 18px 20px' }}>

                    {/* Manual review flag banner */}
                    {v.manualReviewFlag && (
                      <div style={{
                        background: 'rgba(237,137,54,.12)',
                        border: '1px solid var(--orange)',
                        borderRadius: 8,
                        padding: '10px 14px',
                        marginBottom: 16,
                        color: '#fbd38d',
                        fontSize: 13,
                        fontWeight: 600
                      }}>
                        ⚠ Automated checks skipped — manual review required
                      </div>
                    )}

                    {/* Photos side by side */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                          Selfie
                        </div>
                        {v.selfieUrl ? (
                          <img
                            src={v.selfieUrl}
                            alt="Selfie"
                            style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)', maxHeight: 220, objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ height: 120, background: 'var(--dark2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
                            No photo
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                          ID in Hand
                        </div>
                        {v.idInHandUrl ? (
                          <img
                            src={v.idInHandUrl}
                            alt="ID in hand"
                            style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)', maxHeight: 220, objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ height: 120, background: 'var(--dark2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
                            No photo
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ID info */}
                    <div style={{ background: 'var(--dark2)', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
                      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                        <div>
                          <span style={{ color: 'var(--muted)' }}>ID Type: </span>
                          <strong>{v.idType || '—'}</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--muted)' }}>Number: </span>
                          <strong style={{ fontFamily: 'monospace' }}>
                            {v.idNumberHash
                              ? maskId(v.idNumberHash)
                              : '[on file — hash stored]'}
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--muted)' }}>DOB: </span>
                          <strong>{v.dob ? fmtDate(v.dob) : '—'}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Name comparison */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                      <div style={{ background: 'var(--dark2)', borderRadius: 8, padding: '10px 14px' }}>
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>
                          Account Name
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: nameMismatch ? 'var(--orange)' : 'var(--text)' }}>
                          {item.name || '—'}
                        </div>
                      </div>
                      <div style={{ background: 'var(--dark2)', borderRadius: 8, padding: '10px 14px' }}>
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>
                          Name on ID
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: nameMismatch ? 'var(--orange)' : 'var(--text)' }}>
                          {v.idNameAsEntered || '—'}
                        </div>
                      </div>
                    </div>
                    {nameMismatch && (
                      <div style={{ fontSize: 12, color: 'var(--orange)', marginBottom: 14, fontWeight: 600 }}>
                        ⚠ Name mismatch — account name differs from ID name
                      </div>
                    )}

                    {/* Action error */}
                    {actionError && (
                      <div style={{ color: '#fc8181', fontSize: 13, marginBottom: 12 }}>
                        ⚠ {actionError}
                      </div>
                    )}

                    {/* Reject reason input */}
                    {rejectMode && (
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 6 }}>
                          Rejection Reason
                        </label>
                        <textarea
                          value={reason}
                          onChange={e => setReason(e.target.value)}
                          placeholder="Provide a clear reason for rejection…"
                          rows={3}
                          style={{
                            width: '100%', background: 'var(--dark2)', border: '1px solid var(--border)',
                            borderRadius: 8, color: 'var(--text)', padding: '10px 14px',
                            fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none'
                          }}
                        />
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-success"
                        onClick={handleApprove}
                        disabled={actionBusy || rejectMode}
                        style={{ minWidth: 110 }}
                      >
                        {actionBusy && !rejectMode ? '…' : '✅ Approve'}
                      </button>

                      {!rejectMode ? (
                        <button
                          className="btn btn-danger"
                          onClick={() => { setRejectMode(true); setActionError(''); }}
                          disabled={actionBusy}
                          style={{ minWidth: 110 }}
                        >
                          ❌ Reject
                        </button>
                      ) : (
                        <>
                          <button
                            className="btn btn-danger"
                            onClick={handleReject}
                            disabled={actionBusy || !reason.trim()}
                            style={{ minWidth: 130 }}
                          >
                            {actionBusy ? '…' : '❌ Confirm Reject'}
                          </button>
                          <button
                            className="btn btn-ghost"
                            onClick={() => { setRejectMode(false); setReason(''); setActionError(''); }}
                            disabled={actionBusy}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
