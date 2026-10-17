import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('demo@bytevox.ai');
    setPassword('password123');
  };

  return (
    <div className="login-layout">
      <section className="login-story">
        <span className="eyebrow">LESS SPREADSHEET. MORE PERSPECTIVE.</span>
        <h1>Good decisions <br/>start with <br/><em>clear data.</em></h1>
        <p>Turn your datasets into reports that tell the whole story. Build, trace, and share — in one considered workspace.</p>
        <div className="story-chart" aria-hidden="true"><div className="chart-top"><span>FROM DATA TO DIRECTION</span><Icon/></div><div className="chart-bars">{[32, 48, 40, 62, 53, 78, 69, 94].map((height, i) => <i key={i} style={{ height: `${height}%`, '--i': i }}/>)}</div><div className="chart-bottom"><span>Find the signal.</span><span>See the story ↗</span></div></div>
        <div className="story-footer"><span className="status-dot"/> Traceable by design. Shareable with confidence.</div>
      </section>
      <div className="card login-card">
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <span className="eyebrow">YOUR REPORTCRAFT WORKSPACE</span>
          <h2>{isRegister ? 'Create an Account' : 'Welcome back'}</h2>
          <p style={{ fontSize: '0.88rem', marginTop: '0.3rem' }}>
            {isRegister
              ? 'Start uploading datasets & building traceable reports'
              : 'Sign in to access your private datasets and reports'}
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--danger-bg)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#bb6673',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              autoComplete="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={6}
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
          >
            {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#9b83c4',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {isRegister ? 'Sign In' : 'Create one'}
          </button>
        </div>

        {/* Quick Demo Helper */}
        <div
          style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)',
            textAlign: 'center',
          }}
        >
          <button
            type="button"
            onClick={fillDemo}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem' }}
          >
            Explore with demo credentials
          </button>
        </div>
      </div>
    </div>
  );
}
