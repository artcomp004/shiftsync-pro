import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginScreen from './components/LoginScreen';
import ScheduleGrid from './components/ScheduleGrid';
import AdminPanel from './components/AdminPanel';
import WorkerPortal from './components/WorkerPortal';
import Dashboard from './components/Dashboard';
import TeamChat from './components/TeamChat';
import ScheduleArchive from './components/ScheduleArchive';
import SettingsPage from './components/SettingsPage';
import './components/ui/ui.css';
import './App.css';

function App() {
  const { state } = useApp();
  const auth = useAuth();
  const { theme } = state;

  // Determine login state: Supabase mode uses auth.profile, demo mode uses state.currentUser
  const isLoggedIn = auth.configured ? !!auth.profile : !!state.currentUser;
  const currentUser = auth.configured
    ? auth.profile
      ? { id: auth.profile.id, name: auth.profile.name, role: auth.profile.role }
      : null
    : state.currentUser;
  
  const isAdmin = auth.configured ? auth.isAdmin : currentUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState(isAdmin ? 'schedule' : 'my-schedule');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Theme and Font Size effect
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-font', state.fontSize || 'normal');
    
    let baseSize = '16px';
    if (state.fontSize === 'large') baseSize = '17.6px';
    if (state.fontSize === 'xlarge') baseSize = '19.2px';
    document.documentElement.style.fontSize = baseSize;
  }, [theme, state.fontSize]);

  // Update tab when login state changes
  React.useEffect(() => {
    if (isLoggedIn && currentUser) {
      if (currentUser.role === 'admin' && activeTab === 'my-schedule') {
        setActiveTab('schedule');
      } else if (currentUser.role === 'worker' && activeTab === 'admin') {
        setActiveTab('my-schedule');
      }
    }
  }, [isLoggedIn, currentUser?.role]);

  // Show loading spinner during Supabase auth check
  if (auth.configured && auth.loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>טוען...</p>
      </div>
    );
  }

  // Not logged in → Show login screen
  if (!isLoggedIn) {
    return <LoginScreen />;
  }

  return (
    <div className="app-container">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      <main className="main-content">
        <Header
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        <div className="content-area">
          {activeTab === 'schedule' && (
            <div className="view-container schedule-view">
              <ScheduleGrid />
            </div>
          )}

          {activeTab === 'my-schedule' && !isAdmin && (
            <div className="view-container">
              <WorkerPortal />
            </div>
          )}

          {activeTab === 'dashboard' && isAdmin && (
            <div className="view-container">
              <Dashboard />
            </div>
          )}

          {activeTab === 'admin' && isAdmin && (
            <div className="view-container">
              <AdminPanel />
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="view-container chat-view">
              <TeamChat />
            </div>
          )}

          {activeTab === 'archive' && isAdmin && (
            <div className="view-container">
              <ScheduleArchive />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="view-container">
              <SettingsPage />
            </div>
          )}
        </div>
      </main>

      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)}></div>
      )}
    </div>
  );
}

export default App;
