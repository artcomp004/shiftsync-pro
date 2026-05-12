import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { CalendarDays, MessageSquare, Settings, LogOut, Users, Archive, LayoutDashboard, ClipboardList, Sun, Moon, BarChart3 } from 'lucide-react';
import './Sidebar.css';

export default function Sidebar({ activeTab, setActiveTab, mobileMenuOpen, setMobileMenuOpen }) {
  const { state, dispatch } = useApp();
  const auth = useAuth();
  const { currentUser, theme } = state;
  const isAdmin = auth?.configured ? auth.isAdmin : currentUser?.role === 'admin';
  const displayName = auth?.configured ? auth.profile?.name : currentUser?.name;
  const displayRole = isAdmin ? 'מנהל/ת' : 'עובד/ת';

  const handleNav = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    if (auth?.configured) {
      await auth.signOut();
    }
    dispatch({ type: 'LOGOUT' });
  };

  const toggleTheme = () => {
    dispatch({ type: 'SET_THEME', payload: theme === 'dark' ? 'light' : 'dark' });
  };

  const adminNav = [
    { id: 'schedule', icon: CalendarDays, label: 'לוח סידור עבודה' },
    { id: 'dashboard', icon: BarChart3, label: 'לוח בקרה' },
    { id: 'admin', icon: LayoutDashboard, label: 'ניהול עובדים' },
    { id: 'chat', icon: MessageSquare, label: 'צ׳אט צוות' },
    { id: 'archive', icon: Archive, label: 'ארכיון סידורים' },
  ];

  const workerNav = [
    { id: 'my-schedule', icon: ClipboardList, label: 'המשמרות שלי' },
    { id: 'schedule', icon: CalendarDays, label: 'סידור כללי' },
    { id: 'chat', icon: MessageSquare, label: 'צ׳אט צוות' },
  ];

  const navItems = isAdmin ? adminNav : workerNav;

  return (
    <aside className={`sidebar glass-panel ${mobileMenuOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="header-brand">
          <div className="header-brand-logo-pills">
            <div className="pill"></div>
            <div className="pill"></div>
          </div>
          <div className="header-brand-text">
            <span className="header-brand-line1">משמרות</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => {
          let badgeCount = 0;
          if (item.id === 'chat') {
            // Don't show total message count as a badge — it's misleading
            badgeCount = 0;
          }
          if (item.id === 'admin' && isAdmin) {
            const unreadNotes = state.workerNotes?.filter(n => !n.read).length || 0;
            const pendingSwaps = state.swapRequests?.filter(r => r.status === 'pending').length || 0;
            badgeCount = unreadNotes + pendingSwaps;
          }
          if (item.id === 'dashboard' && isAdmin) {
            const weekRequests = state.shiftRequests?.filter(r => {
              const d = new Date();
              d.setDate(d.getDate() - d.getDay() + state.weekOffset * 7);
              const wk = d.toISOString().split('T')[0];
              return r.weekKey === wk;
            }).length || 0;
            if (weekRequests > 0) badgeCount = weekRequests;
          }

          return (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleNav(item.id)}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
              {badgeCount > 0 && (
                <span className="nav-badge">{badgeCount > 99 ? '99+' : badgeCount}</span>
              )}
            </button>
          );
        })}

        <div className="nav-divider"></div>

        <button className="nav-item" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          <span>{theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => handleNav('settings')}
        >
          <Settings size={16} />
          <span>הגדרות</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">{displayName?.charAt(0) || '?'}</div>
          <div className="user-info">
            <p className="user-name">{displayName}</p>
            <p className="user-role">{displayRole}</p>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout} title="התנתק">
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}
