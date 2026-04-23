import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ui/Toast';
import { Sun, Moon, Trash2, Info, Type, Wifi, WifiOff, Shield } from 'lucide-react';
import './SettingsPage.css';

export default function SettingsPage() {
  const { state, dispatch } = useApp();
  const auth = useAuth();
  const toast = useToast();
  const { theme, fontSize } = state;

  const handleResetAll = () => {
    if (confirm('בטוח למחוק את כל הנתונים המקומיים? (שיבוצים, הודעות, ארכיון)')) {
      localStorage.removeItem('shiftsync_pro_state');
      window.location.reload();
    }
  };

  return (
    <div className="settings-page">
      <h2>⚙️ הגדרות</h2>

      {/* Connection Status */}
      <div className="settings-section glass-panel">
        <h3>חיבור</h3>
        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">סטטוס שרת</span>
            <span className="setting-desc">
              {auth?.configured
                ? 'מחובר לשרת Supabase — נתונים מסונכרנים'
                : 'מצב דמו מקומי — נתונים נשמרים בדפדפן בלבד'}
            </span>
          </div>
          <div className={`connection-badge ${auth?.configured ? 'connected' : 'local'}`}>
            {auth?.configured ? <><Wifi size={14} /> מחובר</> : <><WifiOff size={14} /> מקומי</>}
          </div>
        </div>
        {auth?.configured && auth?.profile && (
          <div className="setting-row" style={{ marginTop: '12px' }}>
            <div className="setting-info">
              <span className="setting-label">חשבון</span>
              <span className="setting-desc">{auth.profile.email}</span>
            </div>
            <div className={`connection-badge ${auth.isAdmin ? 'admin-badge' : 'worker-badge'}`}>
              <Shield size={14} /> {auth.isAdmin ? 'מנהל' : 'עובד'}
            </div>
          </div>
        )}
      </div>

      <div className="settings-section glass-panel">
        <h3>מראה</h3>
        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">ערכת נושא</span>
            <span className="setting-desc">בחר בין מצב כהה למצב בהיר</span>
          </div>
          <div className="theme-toggle-group">
            <button
              className={`theme-btn ${theme === 'dark' ? 'active-theme' : ''}`}
              onClick={() => dispatch({ type: 'SET_THEME', payload: 'dark' })}
            >
              <Moon size={16} /> כהה
            </button>
            <button
              className={`theme-btn ${theme === 'light' ? 'active-theme' : ''}`}
              onClick={() => dispatch({ type: 'SET_THEME', payload: 'light' })}
            >
              <Sun size={16} /> בהיר
            </button>
          </div>
        </div>

        <div className="setting-row" style={{ marginTop: '20px' }}>
          <div className="setting-info">
            <span className="setting-label">גודל טקסט</span>
            <span className="setting-desc">הגדל את הטקסט בכל המערכת לרווחת הקריאה</span>
          </div>
          <div className="theme-toggle-group">
            <button
              className={`theme-btn ${fontSize === 'normal' ? 'active-theme' : ''}`}
              onClick={() => dispatch({ type: 'SET_FONT_SIZE', payload: 'normal' })}
            >
              <Type size={14} /> רגיל
            </button>
            <button
              className={`theme-btn ${fontSize === 'large' ? 'active-theme' : ''}`}
              onClick={() => dispatch({ type: 'SET_FONT_SIZE', payload: 'large' })}
            >
              <Type size={16} /> מוגדל
            </button>
            <button
              className={`theme-btn ${fontSize === 'xlarge' ? 'active-theme' : ''}`}
              onClick={() => dispatch({ type: 'SET_FONT_SIZE', payload: 'xlarge' })}
            >
              <Type size={18} /> ענק
            </button>
          </div>
        </div>
      </div>

      <div className="settings-section glass-panel">
        <h3>קיצורי מקלדת</h3>
        <div className="shortcuts-list">
          <div className="shortcut-item">
            <kbd>Ctrl + Z</kbd>
            <span>ביטול פעולה אחרונה</span>
          </div>
          <div className="shortcut-item">
            <kbd>Ctrl + Y</kbd>
            <span>חזרה על פעולה</span>
          </div>
          <div className="shortcut-item">
            <kbd>Ctrl + S</kbd>
            <span>שמור סידור לארכיון</span>
          </div>
          <div className="shortcut-item">
            <kbd>Ctrl + P</kbd>
            <span>הדפסה</span>
          </div>
          <div className="shortcut-item">
            <kbd>Esc</kbd>
            <span>סגירת חלון פתוח</span>
          </div>
        </div>
      </div>

      <div className="settings-section glass-panel">
        <h3>נתונים</h3>
        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">איפוס נתונים מקומיים</span>
            <span className="setting-desc">מחיקת כל השיבוצים, ההודעות והארכיון מהדפדפן</span>
          </div>
          <button className="theme-btn danger-btn" onClick={handleResetAll}>
            <Trash2 size={14} /> איפוס
          </button>
        </div>
      </div>

      <div className="settings-section glass-panel">
        <h3>אודות</h3>
        <div className="about-info">
          <div className="about-row">
            <Info size={16} />
            <span><strong>ShiftSync Pro</strong> — גרסה 3.0</span>
          </div>
          <p className="about-desc">
            מערכת מתקדמת לניהול סידורי עבודה ומשמרות.
            כוללת שיבוץ AI, אימות אימייל, לוח בקרה, ניהול עובדים,
            צ׳אט צוות, ייצוא, ארכיון, ונעילת סידורים.
          </p>
        </div>
      </div>
    </div>
  );
}
