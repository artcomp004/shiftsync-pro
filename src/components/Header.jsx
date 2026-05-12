import React, { useState, useRef, useEffect } from 'react';
import { useApp, getWeekKey } from '../context/AppContext';
import { ROLE_COLORS, getWeekLabel } from '../data/initialData';
import { Search, Bell, User, Menu, X, ChevronRight, ChevronLeft, Lock, Settings } from 'lucide-react';
import './Header.css';

export default function Header({ mobileMenuOpen, setMobileMenuOpen }) {
  const { state, dispatch } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const notiRef = useRef(null);
  const searchRef = useRef(null);
  const settingsRef = useRef(null);

  const unreadCount = state.notifications.filter(n => !n.read).length;
  const pendingSwaps = state.swapRequests.filter(r => r.status === 'pending').length;
  const unreadNotes = (state.workerNotes || []).filter(n => !n.read).length;
  const totalBadge = unreadCount + (state.currentUser?.role === 'admin' ? pendingSwaps + unreadNotes : 0);

  const isAdmin = state.currentUser?.role === 'admin';
  const weekOffset = state.weekOffset || 0;
  const weekKey = getWeekKey(weekOffset);
  const weekLabel = getWeekLabel(weekOffset);
  const isLocked = state.lockedWeeks?.[weekKey];

  // Stats for admin
  const totalRequiredShifts = isAdmin ? state.shiftDefs.reduce((sum, def) => sum + (def.activeDays?.length || 7), 0) : 0;
  const totalQuota = isAdmin ? state.employees.filter(e => e.active).reduce((sum, e) => sum + (e.quota || 0), 0) : 0;
  const quotaDifference = totalQuota - totalRequiredShifts;

  const userName = state.currentUser?.name || 'משתמש';

  useEffect(() => {
    const handler = (e) => {
      if (notiRef.current && !notiRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettingsMenu(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, []);

  // Search results
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return { employees: [], shifts: [] };
    const q = searchQuery.trim().toLowerCase();
    const empResults = state.employees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      e.phone?.includes(q) ||
      e.roles.some(r => r.includes(q))
    ).slice(0, 6);
    const shiftResults = state.shiftDefs.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.hours.includes(q)
    ).slice(0, 4);
    return { employees: empResults, shifts: shiftResults };
  }, [searchQuery, state.employees, state.shiftDefs]);

  const hasResults = searchResults.employees.length > 0 || searchResults.shifts.length > 0;

  return (
    <header className="top-header glass-panel">
      <div className="mobile-menu-trigger">
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="icon-btn">
          <Menu size={20} />
        </button>
      </div>

      {/* Center-left: stats (admin only) */}
      {isAdmin && (
        <div className="header-stats">
          <div className={`hs-stat hs-diff ${quotaDifference < 0 ? 'deficit' : quotaDifference > 0 ? 'surplus' : 'balanced'}`}>
            <span className="hs-label">{quotaDifference < 0 ? 'חוסר במשמרות:' : quotaDifference > 0 ? 'עודף עובדים:' : 'מאוזן'}</span>
            <span className="hs-val" style={{color: quotaDifference < 0 ? 'var(--error)' : 'var(--success)'}}>
              {Math.abs(quotaDifference)}
            </span>
          </div>
          <div className="hs-stat">
            <span className="hs-label">סך מכסות עובדים פעילים:</span>
            <span className="hs-val">{totalQuota}</span>
          </div>
          <div className="hs-stat">
            <span className="hs-label">משמרות לאיוש שבועיות:</span>
            <span className="hs-val">{totalRequiredShifts}</span>
          </div>
        </div>
      )}

      {/* Center: week navigation */}
      <div className="header-week-nav">
        <button className="icon-btn icon-btn-sm" onClick={() => dispatch({ type: 'SET_WEEK_OFFSET', payload: weekOffset + 1 })}>
          <ChevronRight size={14} />
        </button>
        <div className="hw-week-label">
          {isLocked && <Lock size={10} className="lock-inline" />}
          <span>{weekLabel}</span>
        </div>
        <button className="icon-btn icon-btn-sm" onClick={() => dispatch({ type: 'SET_WEEK_OFFSET', payload: weekOffset - 1 })}>
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* Search */}
      <div className="header-search" ref={searchRef}>
        <Search size={15} className="search-icon" />
        <input
          type="text"
          placeholder="חיפוש עובדים, משמרות..."
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
          onFocus={() => { if (searchQuery.trim()) setShowSearchResults(true); }}
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => { setSearchQuery(''); setShowSearchResults(false); }}>
            <X size={12} />
          </button>
        )}
        {showSearchResults && searchQuery.trim() && (
          <div className="search-results-dropdown glass-panel">
            {!hasResults && <div className="search-no-results">לא נמצאו תוצאות</div>}
            {searchResults.employees.length > 0 && (
              <>
                <div className="search-section-label">👥 עובדים</div>
                {searchResults.employees.map(emp => (
                  <div key={emp.id} className="search-result-item">
                    <div className="sr-avatar" style={{ borderColor: ROLE_COLORS[emp.roles?.[0]] || '#3b82f6' }}>
                      {emp.avatar}
                    </div>
                    <div className="sr-info">
                      <span className="sr-name">{emp.name}</span>
                      <span className="sr-meta">{emp.roles.join(', ')} • מכסה: {emp.quota} {!emp.active ? '• מושבת' : ''}</span>
                    </div>
                    <span className={`sr-status ${emp.active ? 'active' : 'inactive'}`}>
                      {emp.active ? 'פעיל' : 'מושבת'}
                    </span>
                  </div>
                ))}
              </>
            )}
            {searchResults.shifts.length > 0 && (
              <>
                <div className="search-section-label">🕐 משמרות</div>
                {searchResults.shifts.map(def => (
                  <div key={def.id} className="search-result-item">
                    <div className="sr-shift-dot" style={{ background: def.color }}></div>
                    <div className="sr-info">
                      <span className="sr-name">{def.name}</span>
                      <span className="sr-meta" style={{ direction: 'ltr', unicodeBidi: 'embed' }}>{def.hours} • {def.section === 'internet' ? 'אינטרנט' : 'ראשי'}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Left section: user + name + notifications */}
      <div className="header-actions">
        <div className="notification-wrapper" ref={notiRef}>
          <button
            className="icon-btn notification-btn"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={17} />
            {totalBadge > 0 && <span className="badge">{totalBadge > 9 ? '9+' : totalBadge}</span>}
          </button>

          {showNotifications && (
            <div className="notification-dropdown glass-panel">
              <div className="noti-header">
                <h4>התראות</h4>
                {state.notifications.length > 0 && (
                  <button className="noti-clear" onClick={() => dispatch({ type: 'CLEAR_NOTIFICATIONS' })}>
                    נקה הכל
                  </button>
                )}
              </div>
              <div className="noti-list">
                {state.currentUser?.role === 'admin' && pendingSwaps > 0 && (
                  <div className="noti-item noti-swap">
                    <span className="noti-icon">🔄</span>
                    <span>{pendingSwaps} בקשות החלפה ממתינות</span>
                  </div>
                )}
                {state.currentUser?.role === 'admin' && unreadNotes > 0 && (
                  <div className="noti-item noti-swap">
                    <span className="noti-icon">💬</span>
                    <span>{unreadNotes} הודעות עובדים חדשות</span>
                  </div>
                )}
                {state.notifications.length === 0 && pendingSwaps === 0 && unreadNotes === 0 && (
                  <div className="noti-empty">אין התראות חדשות</div>
                )}
                {state.notifications.slice(0, 10).map(n => (
                  <div
                    key={n.id}
                    className={`noti-item ${n.read ? '' : 'unread'}`}
                    onClick={() => dispatch({ type: 'MARK_NOTIFICATION_READ', payload: n.id })}
                  >
                    <span className="noti-icon">
                      {n.type === 'success' ? '✓' : n.type === 'warning' ? '⚠' : 'ℹ'}
                    </span>
                    <span>{n.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="header-user-info">
          <User size={15} />
          <span className="header-user-name">{userName}</span>
        </div>
        
        {isAdmin && (
          <div className="settings-wrapper" ref={settingsRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button className="icon-btn" onClick={() => setShowSettingsMenu(!showSettingsMenu)} title="הגדרות">
              <Settings size={17} />
            </button>
            {showSettingsMenu && (
              <div className="notification-dropdown glass-panel" style={{ width: '190px', left: 'calc(100% + 8px)', top: '0' }}>
                <div className="noti-header">
                  <h4>הגדרות מתקדמות</h4>
                </div>
                <div className="noti-list" style={{ padding: '4px' }}>
                  <button className="dropdown-item" style={{ width: '100%', textAlign: 'right', border: 'none', background: 'transparent', padding: '8px', cursor: 'pointer' }} onClick={() => { document.dispatchEvent(new CustomEvent('openModal', { detail: 'shiftDefs' })); setShowSettingsMenu(false); }}>הוספת/הורדה שורת משמרת</button>
                  <button className="dropdown-item" style={{ width: '100%', textAlign: 'right', border: 'none', background: 'transparent', padding: '8px', cursor: 'pointer' }} onClick={() => { document.dispatchEvent(new CustomEvent('openModal', { detail: 'shiftPriority' })); setShowSettingsMenu(false); }}>תיעדוף משמרות</button>
                  <button className="dropdown-item" style={{ width: '100%', textAlign: 'right', border: 'none', background: 'transparent', padding: '8px', cursor: 'pointer' }} onClick={() => { document.dispatchEvent(new CustomEvent('openModal', { detail: 'weeklySettings' })); setShowSettingsMenu(false); }}>עדכון משמרות שבועי</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
