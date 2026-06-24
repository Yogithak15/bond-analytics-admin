import { useState } from 'react';
import { authClient } from '../../lib/auth-client';

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 14px',
  background: '#040c1c',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#f0f4ff',
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.2s',
};

function PasswordInput({ value, onChange, placeholder = '••••••••' }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required
        placeholder={placeholder}
        style={{ ...inputStyle, padding: '10px 42px 10px 14px' }}
        onFocus={e => e.target.style.borderColor = '#2557a7'}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        tabIndex={-1}
        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#3a5070', display: 'flex', alignItems: 'center' }}
      >
        {show ? (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        ) : (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        )}
      </button>
    </div>
  );
}

function ErrorBanner({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#e07070', marginBottom: 20 }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {msg}
    </div>
  );
}

export default function LoginPage({ onLogin }) {
  const [mode, setMode]         = useState('signin'); // 'signin' | 'signup'
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState('');

  const switchMode = (m) => { setMode(m); setError(''); setSuccess(''); };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data, error: authError } = await authClient.signIn.email({ email, password, callbackURL: '/' });
      if (authError) setError(authError.message || 'Invalid credentials');
      else if (data) onLogin();
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const { data, error: authError } = await authClient.signUp.email({ name, email, password, callbackURL: '/' });
      if (authError) setError(authError.message || 'Sign up failed');
      else if (data) onLogin();
    } catch {
      setError('Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      await authClient.signIn.social({ provider: 'google', callbackURL: window.location.origin + '/' });
    } catch {
      setError('Google sign-in failed. Please try again.');
    }
  };

  const isSignIn = mode === 'signin';

  return (
    <div className="login-root" style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter', sans-serif", background: '#040c1c' }}>
      <style>{`
        .login-left { flex: 0 0 46%; display: flex; flex-direction: column; justify-content: space-between;
          padding: 48px 52px;
          background: linear-gradient(145deg, #040c1c 0%, #071528 60%, #0a1f3a 100%);
          border-right: 1px solid rgba(255,255,255,0.06);
          position: relative; overflow: hidden; }
        .login-right { flex: 1; display: flex; align-items: center; justify-content: center;
          padding: 48px 40px; background: #08111f; min-height: 100vh; }
        .login-mobile-brand { display: none; align-items: center; gap: 10px; margin-bottom: 28px; }
        @media (max-width: 640px) {
          .login-root { flex-direction: column; }
          .login-left { display: none !important; }
          .login-right { flex: none; width: 100%; min-height: 100svh; padding: 32px 20px 40px; align-items: flex-start; justify-content: flex-start; box-sizing: border-box; }
          .login-mobile-brand { display: flex !important; }
        }
      `}</style>

      {/* Left panel — branding (desktop only) */}
      <div className="login-left">
        <div style={{ position: 'absolute', top: '30%', left: '20%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,87,167,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg, #2557a7, #1a4285)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="16 7 22 7 22 13" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#f0f4ff', letterSpacing: '-0.2px' }}>BondBulls</span>
        </div>

        {/* Center text */}
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#2557a7', marginBottom: 16 }}>India Debt Markets</div>
          <h1 style={{ fontSize: 38, fontWeight: 700, color: '#f0f4ff', lineHeight: 1.2, letterSpacing: '-0.6px', margin: '0 0 20px' }}>
            Bond Analytics<br />
            <span style={{ color: '#a8c0e0', fontWeight: 400 }}>Intelligence Platform</span>
          </h1>
          <p style={{ fontSize: 15, color: '#6080a8', lineHeight: 1.7, maxWidth: 340, margin: 0 }}>
            Comprehensive insights across G-Secs, SDLs, Corporate Bonds, FPI flows and more — all in one place.
          </p>
        </div>

        <div style={{ fontSize: 12, color: '#3a5070', position: 'relative' }}>© 2026 BondBulls Analytics · Powered by RBI &amp; SEBI data</div>
      </div>

      {/* Right panel — form */}
      <div className="login-right">
        <div style={{ width: '100%', maxWidth: 380 }}>

          {/* Mobile-only brand header */}
          <div className="login-mobile-brand">
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg, #2557a7, #1a4285)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="16 7 22 7 22 13" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f0f4ff', lineHeight: 1.2 }}>BondBulls</div>
              <div style={{ fontSize: 11, color: '#3a5870', marginTop: 1 }}>India Debt Markets Intelligence</div>
            </div>
          </div>

          {/* Tab toggle */}
          <div style={{ display: 'flex', background: '#040c1c', borderRadius: 10, padding: 4, marginBottom: 32, border: '1px solid rgba(255,255,255,0.08)' }}>
            {['signin', 'signup'].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                style={{
                  flex: 1, padding: '8px', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                  background: mode === m ? 'linear-gradient(135deg, #2557a7, #1a4285)' : 'transparent',
                  color: mode === m ? '#fff' : '#6080a8',
                  boxShadow: mode === m ? '0 2px 8px rgba(37,87,167,0.3)' : 'none',
                }}
              >
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#f0f4ff', margin: '0 0 8px', letterSpacing: '-0.3px' }}>
              {isSignIn ? 'Welcome back' : 'Create account'}
            </h2>
            <p style={{ fontSize: 14, color: '#6080a8', margin: 0 }}>
              {isSignIn ? 'Enter your credentials to access the platform' : 'Sign up to get access to the platform'}
            </p>
          </div>

          <form onSubmit={isSignIn ? handleSignIn : handleSignUp}>
            {/* Name — sign up only */}
            {!isSignIn && (
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#a8c0e0', marginBottom: 7 }}>Full Name</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Your full name"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#2557a7'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#a8c0e0', marginBottom: 7 }}>Email address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#2557a7'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#a8c0e0', marginBottom: 7 }}>Password</label>
              <PasswordInput value={password} onChange={e => setPassword(e.target.value)} placeholder={isSignIn ? '••••••••' : 'Min 8 characters'} />
            </div>

            {success && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(39,174,96,0.1)', border: '1px solid rgba(39,174,96,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#6fcf97', marginBottom: 20 }}>
                {success}
              </div>
            )}

            <ErrorBanner msg={error} />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '11px',
                background: loading ? 'rgba(37,87,167,0.4)' : 'linear-gradient(135deg, #2557a7, #1a4285)',
                color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.01em',
                boxShadow: loading ? 'none' : '0 2px 12px rgba(37,87,167,0.35)',
                transition: 'opacity 0.2s, box-shadow 0.2s',
              }}
            >
              {loading ? (isSignIn ? 'Signing in…' : 'Creating account…') : (isSignIn ? 'Sign In →' : 'Create Account →')}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: 12, color: '#3a5070' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Google sign-in */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            style={{
              width: '100%', padding: '10px 14px',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, color: '#a8c0e0', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'background 0.2s, border-color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            Continue with Google
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#3a5070', marginTop: 24 }}>
            Secure access · Session expires after inactivity
          </p>
        </div>
      </div>
    </div>
  );
}
