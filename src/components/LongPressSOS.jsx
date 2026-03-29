import { useRef, useState, useCallback } from 'react';

const HOLD_MS = 3000;
const R = 44; // SVG circle radius
const CIRCUMFERENCE = 2 * Math.PI * R;

export default function LongPressSOS({ onActivate, disabled, busy }) {
  const [progress, setProgress] = useState(0); // 0-1
  const startRef  = useRef(null);
  const rafRef    = useRef(null);
  const activeRef = useRef(false);

  const startHold = useCallback(() => {
    if (disabled || busy) return;
    activeRef.current = true;
    startRef.current  = performance.now();

    const tick = (now) => {
      if (!activeRef.current) return;
      const elapsed = now - startRef.current;
      const pct     = Math.min(elapsed / HOLD_MS, 1);
      setProgress(pct);
      if (pct < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        activeRef.current = false;
        setProgress(0);
        onActivate();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [disabled, busy, onActivate]);

  const cancelHold = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    cancelAnimationFrame(rafRef.current);
    setProgress(0);
  }, []);

  const strokeDash = CIRCUMFERENCE * (1 - progress);
  const isHolding  = progress > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div
        style={{ position: 'relative', width: 120, height: 120, cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none', WebkitUserSelect: 'none' }}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onContextMenu={e => e.preventDefault()}
      >
        {/* SVG progress ring */}
        <svg width="120" height="120" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="5" />
          {/* Progress */}
          <circle
            cx="60" cy="60" r={R} fill="none"
            stroke={disabled ? 'var(--muted)' : 'var(--red)'}
            strokeWidth="5"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDash}
            strokeLinecap="round"
            style={{ transition: isHolding ? 'none' : 'stroke-dashoffset .2s' }}
          />
        </svg>

        {/* Button circle */}
        <div style={{
          position: 'absolute', inset: 8,
          borderRadius: '50%',
          background: disabled ? 'rgba(100,100,100,.3)' : isHolding ? 'rgba(229,62,62,.9)' : 'rgba(229,62,62,.75)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          boxShadow: disabled ? 'none' : isHolding ? '0 0 24px rgba(229,62,62,.6)' : '0 0 16px rgba(229,62,62,.4)',
          transition: 'background .15s, box-shadow .15s',
          opacity: disabled ? 0.4 : 1,
        }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: 1 }}>SOS</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.8)', fontWeight: 600, letterSpacing: 1 }}>
            {busy ? 'SENDING…' : isHolding ? 'HOLD…' : 'HOLD 3s'}
          </span>
        </div>
      </div>

      {disabled && (
        <p style={{ color: 'var(--orange)', fontSize: 12, textAlign: 'center', maxWidth: 220 }}>
          Verify your identity to enable SOS
        </p>
      )}
      {!disabled && !isHolding && !busy && (
        <p style={{ color: 'var(--muted)', fontSize: 12 }}>Hold for 3 seconds to trigger</p>
      )}
      {isHolding && (
        <p style={{ color: 'var(--red)', fontSize: 12, fontWeight: 700 }}>
          {Math.ceil((1 - progress) * 3)}s…
        </p>
      )}
    </div>
  );
}
