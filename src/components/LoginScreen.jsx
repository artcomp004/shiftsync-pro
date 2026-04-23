import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Clock, Shield, User, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import './LoginScreen.css';

export default function LoginScreen() {
  const auth = useAuth();
  const app = useApp();

  // Determine if we're in Supabase mode or demo mode
  const isConfigured = auth?.configured;

  // Demo mode state (when Supabase isn't configured)
  const [demoMode, setDemoMode] = useState(null); // null | 'admin' | 'worker'
  const [selectedEmpId, setSelectedEmpId] = useState('');

  // Auth mode state (when Supabase is configured)
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [localError, setLocalError] = useState('');

  // ===== Supabase Auth Handlers =====
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsSubmitting(true);
    setLocalError('');
    setSuccessMsg('');

    const { error } = await auth.signIn(email, password);
    if (error) {
      setLocalError(translateError(error.message));
    }
    setIsSubmitting(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email || !password || !name) return;
    if (password.length < 6) {
      setLocalError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }
    setIsSubmitting(true);
    setLocalError('');
    setSuccessMsg('');

    const { data, error } = await auth.signUp(email, password, name);
    if (error) {
      setLocalError(translateError(error.message));
    } else if (data?.user?.identities?.length === 0) {
      setLocalError('אימייל זה כבר רשום במערכת. נסה להתחבר.');
    } else {
      setSuccessMsg('נרשמת בהצלחה! בדוק את תיבת האימייל שלך לאישור החשבון.');
    }
    setIsSubmitting(false);
  };

  const translateError = (msg) => {
    if (msg.includes('Invalid login credentials')) return 'אימייל או סיסמה שגויים';
    if (msg.includes('Email not confirmed')) return 'יש לאשר את האימייל שלך לפני הכניסה. בדוק את תיבת הדואר.';
    if (msg.includes('User already registered')) return 'אימייל זה כבר רשום. נסה להתחבר.';
    if (msg.includes('Password should be')) return 'הסיסמה חייבת להכיל לפחות 6 תווים';
    if (msg.includes('rate limit')) return 'יותר מדי ניסיונות. נסה שוב מאוחר יותר.';
    return msg;
  };

  // ===== Demo Mode Handlers =====
  const handleDemoAdminLogin = () => {
    app.dispatch({ type: 'LOGIN', payload: { id: 'admin', name: 'מנהל מערכת', role: 'admin' } });
  };

  const handleDemoWorkerLogin = () => {
    const emp = app.state.employees.find(e => e.id === selectedEmpId);
    if (!emp) return;
    app.dispatch({ type: 'LOGIN', payload: { id: emp.id, name: emp.name, role: 'worker' } });
  };

  return (
    <div className="login-screen">
      <div className="login-bg-effect"></div>
      <div className="login-bg-effect login-bg-effect-2"></div>
      <div className="login-bg-effect login-bg-effect-3"></div>

      <div className="login-card glass-panel">
        <div className="login-logo">
          <div className="login-logo-icon">
            <Clock size={28} />
          </div>
          <h1>ShiftSync Pro</h1>
          <p className="login-subtitle">מערכת ניהול סידורי עבודה</p>
        </div>

        {/* ===== SUPABASE MODE ===== */}
        {isConfigured && (
          <>
            {/* Tab Switcher */}
            <div className="auth-tab-switcher">
              <button
                className={`auth-tab ${authTab === 'login' ? 'active' : ''}`}
                onClick={() => { setAuthTab('login'); setLocalError(''); setSuccessMsg(''); }}
              >
                <Shield size={16} /> כניסה
              </button>
              <button
                className={`auth-tab ${authTab === 'register' ? 'active' : ''}`}
                onClick={() => { setAuthTab('register'); setLocalError(''); setSuccessMsg(''); }}
              >
                <User size={16} /> הרשמה
              </button>
            </div>

            {/* Login Form */}
            {authTab === 'login' && (
              <form onSubmit={handleLogin} className="login-form-area" id="login-form">
                <div className="auth-input-group">
                  <Mail size={18} className="auth-input-icon" />
                  <input
                    id="login-email"
                    type="email"
                    placeholder="אימייל"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    dir="ltr"
                  />
                </div>
                <div className="auth-input-group">
                  <Lock size={18} className="auth-input-icon" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="סיסמה"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {localError && <div className="auth-error">{localError}</div>}
                {auth.error && !localError && <div className="auth-error">{translateError(auth.error)}</div>}

                <button
                  type="submit"
                  className="btn-primary login-submit"
                  disabled={isSubmitting || !email || !password}
                  id="login-submit-btn"
                >
                  {isSubmitting ? (
                    <><Loader2 size={18} className="spin-icon" /> מתחבר...</>
                  ) : (
                    <><ArrowRight size={18} /> התחבר</>
                  )}
                </button>
              </form>
            )}

            {/* Register Form */}
            {authTab === 'register' && (
              <form onSubmit={handleRegister} className="login-form-area" id="register-form">
                <div className="auth-input-group">
                  <User size={18} className="auth-input-icon" />
                  <input
                    id="register-name"
                    type="text"
                    placeholder="שם מלא"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="auth-input-group">
                  <Mail size={18} className="auth-input-icon" />
                  <input
                    id="register-email"
                    type="email"
                    placeholder="אימייל"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    dir="ltr"
                  />
                </div>
                <div className="auth-input-group">
                  <Lock size={18} className="auth-input-icon" />
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="סיסמה (מינימום 6 תווים)"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {localError && <div className="auth-error">{localError}</div>}

                {successMsg && (
                  <div className="auth-success">
                    <CheckCircle2 size={18} />
                    <span>{successMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary login-submit"
                  disabled={isSubmitting || !email || !password || !name}
                  id="register-submit-btn"
                >
                  {isSubmitting ? (
                    <><Loader2 size={18} className="spin-icon" /> נרשם...</>
                  ) : (
                    <><User size={18} /> הרשמה</>
                  )}
                </button>
              </form>
            )}
          </>
        )}

        {/* ===== DEMO MODE (no Supabase) ===== */}
        {!isConfigured && (
          <>
            <div className="demo-badge">
              <span>🔧 מצב דמו — ללא חיבור לשרת</span>
            </div>

            {!demoMode && (
              <div className="login-mode-selector">
                <button className="login-mode-btn admin-mode" onClick={() => setDemoMode('admin')}>
                  <div className="mode-icon-wrap admin-icon-wrap">
                    <Shield size={24} />
                  </div>
                  <span className="mode-label">כניסה כמנהל</span>
                  <span className="mode-desc">ניהול מלא של סידורים, עובדים ומשמרות</span>
                </button>
                <button className="login-mode-btn worker-mode" onClick={() => setDemoMode('worker')}>
                  <div className="mode-icon-wrap worker-icon-wrap">
                    <User size={24} />
                  </div>
                  <span className="mode-label">כניסה כעובד</span>
                  <span className="mode-desc">צפייה במשמרות, בקשת החלפות וצ׳אט</span>
                </button>
              </div>
            )}

            {demoMode === 'admin' && (
              <div className="login-form-area">
                <h3>כניסת מנהל</h3>
                <p className="login-form-desc">ניהול מלא – סידורי עבודה, עובדים, ונעילת משמרות</p>
                <button className="btn-primary login-submit" onClick={handleDemoAdminLogin}>
                  <Shield size={18} />
                  כניסה למערכת ניהול
                </button>
                <button className="login-back" onClick={() => setDemoMode(null)}>← חזור</button>
              </div>
            )}

            {demoMode === 'worker' && (
              <div className="login-form-area">
                <h3>כניסת עובד</h3>
                <p className="login-form-desc">בחר/י את שמך מהרשימה:</p>
                <div className="login-select-wrap">
                  <select
                    value={selectedEmpId}
                    onChange={e => setSelectedEmpId(e.target.value)}
                    className="login-select"
                  >
                    <option value="">— בחר עובד —</option>
                    {app.state.employees.filter(e => e.active).map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.roles.join(', ')})</option>
                    ))}
                  </select>
                </div>
                <button
                  className="btn-primary login-submit"
                  onClick={handleDemoWorkerLogin}
                  disabled={!selectedEmpId}
                >
                  <User size={18} />
                  כניסה
                </button>
                <button className="login-back" onClick={() => setDemoMode(null)}>← חזור</button>
              </div>
            )}
          </>
        )}

        <div className="login-footer">
          <span>ShiftSync Pro v3.0</span>
        </div>
      </div>
    </div>
  );
}
