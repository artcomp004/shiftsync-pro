import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ROLE_COLORS } from '../data/initialData';
import { Send, Smile } from 'lucide-react';
import './TeamChat.css';

const EMOJI_LIST = ['😀','😂','❤️','👍','🔥','✅','⭐','💪','🎉','👋','📢','🙏','😊','💬','⚡'];

export default function TeamChat() {
  const { state, dispatch } = useApp();
  const { currentUser, chatMessages, employees } = state;

  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  const handleSend = () => {
    if (!text.trim()) return;
    dispatch({
      type: 'ADD_CHAT_MESSAGE',
      payload: {
        id: `msg${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        text: text.trim(),
        timestamp: new Date().toISOString(),
        isAdmin: currentUser.role === 'admin'
      }
    });
    setText('');
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addEmoji = (emoji) => {
    setText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  // Group messages by date
  let lastDate = '';

  return (
    <div className="team-chat">
      <div className="chat-header glass-panel">
        <h3>💬 צ׳אט צוות</h3>
        <span className="chat-member-count">{employees.filter(e => e.active).length} חברי צוות</span>
      </div>

      <div className="chat-messages">
        {chatMessages.length === 0 && (
          <div className="chat-empty">
            <span className="chat-empty-icon">💬</span>
            <h4>ברוכים הבאים לצ׳אט הצוות!</h4>
            <p>שלחו הודעה ראשונה כדי להתחיל</p>
          </div>
        )}

        {chatMessages.map((msg, idx) => {
          const isMe = msg.userId === currentUser.id;
          const dateStr = formatDate(msg.timestamp);
          let showDate = false;
          if (dateStr !== lastDate) { showDate = true; lastDate = dateStr; }

          const emp = employees.find(e => e.id === msg.userId);
          const avatarColor = emp ? (ROLE_COLORS[emp.roles?.[0]] || '#3b82f6') : '#3b82f6';

          return (
            <React.Fragment key={msg.id}>
              {showDate && <div className="chat-date-divider"><span>{dateStr}</span></div>}
              <div className={`chat-msg ${isMe ? 'msg-me' : 'msg-other'}`}>
                {!isMe && (
                  <div className="msg-avatar" style={{ borderColor: avatarColor }}>
                    {msg.userName.charAt(0)}
                  </div>
                )}
                <div className="msg-bubble">
                  {!isMe && (
                    <div className="msg-sender">
                      <span className="msg-name">{msg.userName}</span>
                      {msg.isAdmin && <span className="admin-badge">מנהל</span>}
                    </div>
                  )}
                  <p className="msg-text">{msg.text}</p>
                  <span className="msg-time">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area glass-panel">
        {showEmoji && (
          <div className="emoji-picker">
            {EMOJI_LIST.map(e => (
              <button key={e} className="emoji-btn" onClick={() => addEmoji(e)}>{e}</button>
            ))}
          </div>
        )}
        <div className="chat-input-row">
          <button className="chat-emoji-toggle" onClick={() => setShowEmoji(!showEmoji)}>
            <Smile size={20} />
          </button>
          <input
            ref={inputRef}
            type="text"
            placeholder="כתוב/י הודעה..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="chat-send-btn" onClick={handleSend} disabled={!text.trim()}>
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
