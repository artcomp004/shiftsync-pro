import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Bell, User, Menu } from 'lucide-react';
import './Header.css';

export default function Header({ mobileMenuOpen, setMobileMenuOpen }) {
  const { state, dispatch } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const notiRef = useRef(null);

  const unreadCount = state.notifications.filter(n => !n.read).length;
  const pendingSwaps = state.swapRequests.filter(r => r.status === 'pending').length;
  const totalBadge = unreadCount + (state.currentUser?.role === 'admin' ? pendingSwaps : 0);

  useEffect(() => {
    const handler = (e) => {
      if (notiRef.current && !notiRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="top-header glass-panel">
      <div className="mobile-menu-trigger">
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="icon-btn">
          <Menu size={24} />
        </button>
      </div>

      <div className="header-search">
        <Search size={18} className="search-icon" />
        <input type="text" placeholder="חיפוש עובדים, משמרות..." />
      </div>

      <div className="header-actions">
        <div className="notification-wrapper" ref={notiRef}>
          <button
            className="icon-btn notification-btn"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={20} />
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
                {state.notifications.length === 0 && pendingSwaps === 0 && (
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
        <button className="icon-btn profile-btn-mobile">
          <User size={20} />
        </button>
      </div>
    </header>
  );
}
