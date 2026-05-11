import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { ROLE_COLORS } from '../data/initialData';
import { Send, Smile, SpellCheck, X } from 'lucide-react';
import { checkText, autoCorrect, checkWord, getLastWord } from '../utils/hebrewSpellCheck';
import './TeamChat.css';

const EMOJI_LIST = ['😀','😂','❤️','👍','🔥','✅','⭐','💪','🎉','👋','📢','🙏','😊','💬','⚡'];

export default function TeamChat() {
  const { state, dispatch } = useApp();
  const { currentUser, chatMessages, employees } = state;

  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [spellErrors, setSpellErrors] = useState([]); // { index, original, cleanWord, suggestions }[]
  const [activeSuggestion, setActiveSuggestion] = useState(null); // { wordIndex, rect?, suggestions }
  const [spellEnabled, setSpellEnabled] = useState(true);
  const [lastAutoCorrect, setLastAutoCorrect] = useState(null); // { original, corrected, timestamp }
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const spellTimerRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  // ── Spell-check on text change (debounced) ───────────────────────────
  const runSpellCheck = useCallback((value) => {
    if (!spellEnabled || !value.trim()) {
      setSpellErrors([]);
      setActiveSuggestion(null);
      return;
    }
    const errors = checkText(value);
    setSpellErrors(errors);
  }, [spellEnabled]);

  useEffect(() => {
    if (spellTimerRef.current) clearTimeout(spellTimerRef.current);
    spellTimerRef.current = setTimeout(() => runSpellCheck(text), 300);
    return () => clearTimeout(spellTimerRef.current);
  }, [text, runSpellCheck]);

  // ── Apply a suggestion ───────────────────────────────────────────────
  const applySuggestion = (errorIdx, suggestion) => {
    const words = text.split(/\s+/);
    const error = spellErrors[errorIdx];
    if (!error) return;
    words[error.index] = words[error.index].replace(error.cleanWord, suggestion);
    const newText = words.join(' ');
    setText(newText);
    setActiveSuggestion(null);
    // Re-run spell check immediately
    const errors = checkText(newText);
    setSpellErrors(errors);
    inputRef.current?.focus();
  };

  // ── Undo auto-correct ────────────────────────────────────────────────
  const undoAutoCorrect = () => {
    if (!lastAutoCorrect) return;
    setText(lastAutoCorrect.original);
    setLastAutoCorrect(null);
    inputRef.current?.focus();
  };

  // ── Auto-correct before sending ──────────────────────────────────────
  const handleSend = () => {
    if (!text.trim()) return;

    let finalText = text.trim();

    // Auto-correct known typos before sending
    if (spellEnabled) {
      const corrected = autoCorrect(finalText);
      if (corrected !== finalText) {
        setLastAutoCorrect({ original: finalText, corrected, timestamp: Date.now() });
        finalText = corrected;
      }
    }

    dispatch({
      type: 'ADD_CHAT_MESSAGE',
      payload: {
        id: `msg${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        text: finalText,
        timestamp: new Date().toISOString(),
        isAdmin: currentUser.role === 'admin'
      }
    });
    setText('');
    setShowEmoji(false);
    setSpellErrors([]);
    setActiveSuggestion(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Escape dismisses suggestion popup
    if (e.key === 'Escape') {
      setActiveSuggestion(null);
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

  // ── Build highlighted text with error underlines ─────────────────────
  const renderHighlightedText = () => {
    if (!spellEnabled || spellErrors.length === 0 || !text) return null;

    const words = text.split(/(\s+)/);
    let wordIdx = 0;

    return (
      <div className="spell-highlight-overlay" aria-hidden="true">
        {words.map((segment, i) => {
          if (/^\s+$/.test(segment)) {
            return <span key={i}>{segment}</span>;
          }
          const currentWordIdx = wordIdx;
          wordIdx++;
          const error = spellErrors.find(e => e.index === currentWordIdx);
          if (error) {
            return (
              <span
                key={i}
                className="spell-error-word"
                onClick={() => setActiveSuggestion(
                  activeSuggestion?.wordIndex === currentWordIdx
                    ? null
                    : { wordIndex: currentWordIdx, errorIdx: spellErrors.indexOf(error) }
                )}
              >
                {segment}
              </span>
            );
          }
          return <span key={i}>{segment}</span>;
        })}
      </div>
    );
  };

  // Group messages by date
  let lastDate = '';

  // Clear auto-correct notification after 5 seconds
  useEffect(() => {
    if (lastAutoCorrect) {
      const timer = setTimeout(() => setLastAutoCorrect(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [lastAutoCorrect]);

  return (
    <div className="team-chat">
      <div className="chat-header glass-panel">
        <h3>💬 צ׳אט צוות</h3>
        <div className="chat-header-actions">
          <button
            className={`spell-toggle-btn ${spellEnabled ? 'active' : ''}`}
            onClick={() => {
              setSpellEnabled(!spellEnabled);
              if (!spellEnabled) {
                setSpellErrors([]);
                setActiveSuggestion(null);
              }
            }}
            title={spellEnabled ? 'בדיקת איות פעילה' : 'בדיקת איות כבויה'}
          >
            <SpellCheck size={16} />
            <span className="spell-toggle-label">{spellEnabled ? 'איות' : 'איות'}</span>
          </button>
          <span className="chat-member-count">{employees.filter(e => e.active).length} חברי צוות</span>
        </div>
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

      {/* Auto-correct notification banner */}
      {lastAutoCorrect && (
        <div className="autocorrect-banner">
          <span className="autocorrect-icon">✨</span>
          <span className="autocorrect-text">
            תוקן: <strong>{lastAutoCorrect.original}</strong> → <strong>{lastAutoCorrect.corrected}</strong>
          </span>
          <button className="autocorrect-undo" onClick={undoAutoCorrect}>
            ביטול
          </button>
          <button className="autocorrect-dismiss" onClick={() => setLastAutoCorrect(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="chat-input-area glass-panel">
        {showEmoji && (
          <div className="emoji-picker">
            {EMOJI_LIST.map(e => (
              <button key={e} className="emoji-btn" onClick={() => addEmoji(e)}>{e}</button>
            ))}
          </div>
        )}

        {/* Spell-check suggestion popup */}
        {activeSuggestion !== null && spellErrors[activeSuggestion.errorIdx] && (
          <div className="spell-suggestions-popup">
            <div className="spell-suggestions-header">
              <SpellCheck size={14} />
              <span>הצעות תיקון עבור: <strong>{spellErrors[activeSuggestion.errorIdx].cleanWord}</strong></span>
              <button className="spell-close-btn" onClick={() => setActiveSuggestion(null)}>
                <X size={14} />
              </button>
            </div>
            <div className="spell-suggestions-list">
              {spellErrors[activeSuggestion.errorIdx].suggestions.map((sug, i) => (
                <button
                  key={i}
                  className="spell-suggestion-btn"
                  onClick={() => applySuggestion(activeSuggestion.errorIdx, sug)}
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Inline error indicator */}
        {spellEnabled && spellErrors.length > 0 && (
          <div className="spell-error-bar">
            <SpellCheck size={14} />
            <span>
              נמצאו {spellErrors.length} שגיאות איות —
              {spellErrors.map((err, i) => (
                <button
                  key={i}
                  className="spell-error-tag"
                  onClick={() => setActiveSuggestion(
                    activeSuggestion?.errorIdx === i ? null : { wordIndex: err.index, errorIdx: i }
                  )}
                >
                  {err.cleanWord}
                </button>
              ))}
            </span>
          </div>
        )}

        <div className="chat-input-row">
          <button className="chat-emoji-toggle" onClick={() => setShowEmoji(!showEmoji)}>
            <Smile size={20} />
          </button>
          <input
            ref={inputRef}
            type="text"
            lang="he"
            dir="rtl"
            spellCheck={spellEnabled}
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
