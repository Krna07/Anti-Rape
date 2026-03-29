import { Github, ShieldAlert } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--card)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      padding: '20px 24px',
      marginTop: 'auto',
    }}>
      <div style={{
        maxWidth: 1000,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldAlert size={18} style={{ color: 'var(--primary)' }} />
          <span style={{
            fontWeight: 900,
            fontSize: 15,
            background: 'var(--gradient)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: 1,
          }}>
            ANTI-R
          </span>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>
            — Real-Time Emergency Response Network
          </span>
        </div>

        {/* Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a
            href="https://github.com/Krna07/Anti-Rape_Backend"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 600, color: 'var(--muted)',
              transition: 'color .2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
          >
            <Github size={15} /> Backend
          </a>
          <a
            href="https://github.com/Krna07/Anti-Rape"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 600, color: 'var(--muted)',
              transition: 'color .2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
          >
            <Github size={15} /> Frontend
          </a>
          <span style={{
            width: 1, height: 16,
            background: 'var(--border)',
            display: 'inline-block',
          }} />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            © {new Date().getFullYear()} ANTI-R. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
