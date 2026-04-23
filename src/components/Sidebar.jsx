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
        <div className="logo-container">
          <div className="logo-icon"></div>
          <h1>ShiftSync</h1>
        </div>
        <span className="version-badge">Pro</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => handleNav(item.id)}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
            {item.id === 'chat' && state.chatMessages.length > 0 && (
              <span className="nav-badge">{state.chatMessages.length > 99 ? '99+' : ''}</span>
            )}
          </button>
        ))}

        <div className="nav-divider"></div>

        <button className="nav-item" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          <span>{theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => handleNav('settings')}
        >
          <Settings size={20} />
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
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
