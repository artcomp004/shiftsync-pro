import React, { useState, useMemo } from 'react';
import { useApp, getWeekKey } from '../context/AppContext';
import { useToast } from './ui/Toast';
import Modal from './ui/Modal';
import { getWeekDays, getWeekLabel, getShiftForDay, ROLE_COLORS } from '../data/initialData';
import {
  Clock, Lock, ArrowLeftRight, ChevronRight, ChevronLeft,
  CalendarCheck, AlertCircle, Plus, CheckCircle2, Send, MessageSquareMore
} from 'lucide-react';
import './WorkerPortal.css';

// Fixed 3 shift slots for the reservation table
// Map to approximate shiftDef IDs so admin panel can cross-reference
const RESERVATION_SLOTS = [
  { id: 'morning', name: 'בוקר', hours: '05:00 - 12:00', color: '#f59e0b', shiftDefIds: ['t1', 't2', 't3', 't8'] },
  { id: 'noon',    name: 'צוהרים', hours: '12:00 - 21:00', color: '#3b82f6', shiftDefIds: ['t4', 't5', 't6'] },
  { id: 'evening', name: 'ערב', hours: '15:00 - 00:00', color: '#8b5cf6', shiftDefIds: ['t7', 't9'] },
];

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export default function WorkerPortal() {
  const { state, dispatch, weekKey } = useApp();
  const toast = useToast();
  const { currentUser, employees, shiftDefs, assignments, isLocked, swapRequests, weekOffset } = state;

  const emp = employees.find(e => e.id === currentUser?.id);

  // Tab state
  const [activeTab, setActiveTab] = useState('my-shifts'); // 'my-shifts' | 'my-requests'

  const [showSwapModal, setShowSwapModal] = useState(null);
  const [swapReason, setSwapReason] = useState('');
  const [noteText, setNoteText] = useState('');
  const [noteSending, setNoteSending] = useState(false);

  // Request Form State
  const [blockedDay, setBlockedDay] = useState(null);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [requestComment, setRequestComment] = useState('');
  const [requestSending, setRequestSending] = useState(false);
  const [requestedQuota, setRequestedQuota] = useState(5);

  if (!emp) return <div className="worker-portal"><h2>עובד לא נמצא</h2></div>;

  const weekDays = getWeekDays(weekOffset);
  const weekLabel = getWeekLabel(weekOffset);
  const myShifts = assignments.filter(a => a.empId === emp.id && a.weekKey === weekKey);
  const myRequests = swapRequests.filter(r => r.empId === emp.id);
  const shiftCount = myShifts.length;

  const MAX_SHIFTS = emp.quota || 5;
  const MAX_BLOCKED_SLOTS = 2;

  // Reset blocked state when week changes
  React.useEffect(() => {
    const existing = state.shiftRequests.find(r => r.empId === emp.id && r.weekKey === weekKey);
    if (existing) {
      setBlockedDay(existing.blockedDay ?? null);
      setBlockedSlots(existing.blockedSlots || []);
      setRequestComment(existing.comment || '');
      setRequestedQuota(existing.requestedQuota ?? emp.quota ?? 5);
    } else {
      setBlockedDay(null);
      setBlockedSlots([]);
      setRequestComment('');
      setRequestedQuota(emp.quota || 5);
    }
  }, [weekKey, emp.id]);

  // ===== Dynamic availability count =====
  // Count how many day-slots are available (not blocked by worker)
  const totalSlots = 7 * 3;
  const blockedDaySlots = blockedDay !== null ? 3 : 0;
  const availableSlots = totalSlots - blockedDaySlots - blockedSlots.length;
  // Count available DAYS (days that have at least 1 open slot)
  const availableDays = weekDays.filter(d => {
    if (blockedDay === d.idx) return false;
    const blockedInDay = blockedSlots.filter(s => s.dayIdx === d.idx).length;
    return blockedInDay < 3; // At least 1 slot open
  }).length;

  // ===== Get unique shift definitions that the worker is assigned to this week =====
  const myShiftDefs = useMemo(() => {
    const defIds = [...new Set(myShifts.map(s => s.shiftDefId))];
    return defIds.map(id => shiftDefs.find(d => d.id === id)).filter(Boolean);
  }, [myShifts, shiftDefs]);

  const handleSelfRemove = (assignmentId) => {
    if (isLocked) { toast('הסידור נעול', 'warning'); return; }
    dispatch({ type: 'REMOVE_ASSIGNMENT', payload: assignmentId });
    toast('הוסרת מהמשמרת', 'info');
  };

  // ===== Reservation blocking logic =====
  const toggleBlockDay = (dayIdx) => {
    if (blockedDay === dayIdx) {
      setBlockedDay(null);
    } else {
      setBlockedDay(dayIdx);
      setBlockedSlots(prev => prev.filter(p => p.dayIdx !== dayIdx));
    }
  };

  const cycleCellState = (dayIdx, slotId) => {
    if (blockedDay === dayIdx) return;
    const isBlocked = blockedSlots.some(p => p.dayIdx === dayIdx && p.slotId === slotId);
    if (isBlocked) {
      setBlockedSlots(prev => prev.filter(p => !(p.dayIdx === dayIdx && p.slotId === slotId)));
    } else {
      if (blockedSlots.length >= MAX_BLOCKED_SLOTS) {
        toast(`ניתן לחסום עד ${MAX_BLOCKED_SLOTS} משמרות נוספות`, 'warning');
        return;
      }
      setBlockedSlots(prev => [...prev, { dayIdx, slotId }]);
    }
  };

  const getCellState = (dayIdx, slotId) => {
    if (blockedDay === dayIdx) return 'blocked-day';
    if (blockedSlots.some(p => p.dayIdx === dayIdx && p.slotId === slotId)) return 'blocked-slot';
    return 'available';
  };

  const handleSubmitRequest = () => {
    setRequestSending(true);
    // Map blocked slots to actual shiftDefIds for admin-side cross-reference
    const preferNotSlots = blockedSlots.flatMap(s => {
      const slot = RESERVATION_SLOTS.find(rs => rs.id === s.slotId);
      if (!slot) return [{ dayIdx: s.dayIdx, slotId: s.slotId }];
      return slot.shiftDefIds.map(shiftDefId => ({ dayIdx: s.dayIdx, shiftDefId, slotId: s.slotId }));
    });
    const newReq = {
      id: `req_${Date.now()}`,
      empId: emp.id,
      weekKey,
      blockedDay,
      blockedSlots,
      preferNotSlots,
      comment: requestComment.trim(),
      requestedQuota,
      reservationSlots: RESERVATION_SLOTS,
      availableDays,
      shiftCount,
      timestamp: new Date().toISOString()
    };
    const existingIdx = state.shiftRequests.findIndex(r => r.empId === emp.id && r.weekKey === weekKey);
    if (existingIdx >= 0) {
      dispatch({ type: 'UPDATE_SHIFT_REQUEST', payload: newReq });
    } else {
      dispatch({ type: 'ADD_SHIFT_REQUEST', payload: newReq });
    }
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: { id: `n${Date.now()}`, text: `${emp.name} שלח/ה בקשת משמרות וזמינות לשבוע ${weekLabel}`, type: 'info', timestamp: new Date().toISOString(), read: false }
    });
    setTimeout(() => {
      setRequestSending(false);
      toast('הבקשה השבועית נשלחה למנהל!', 'success');
    }, 600);
  };

  const existingRequest = state.shiftRequests.find(r => r.empId === emp.id && r.weekKey === weekKey);

  // ===== Note submission =====
  const handleSendNote = () => {
    if (!noteText.trim()) return;
    setNoteSending(true);
    dispatch({ type: 'ADD_WORKER_NOTE', payload: { id: `wn${Date.now()}`, empId: emp.id, empName: emp.name, text: noteText.trim(), timestamp: new Date().toISOString(), read: false } });
    dispatch({ type: 'ADD_NOTIFICATION', payload: { id: `n${Date.now()}`, text: `הודעה מ-${emp.name}: ${noteText.slice(0, 50)}...`, type: 'info', timestamp: new Date().toISOString(), read: false } });
    setTimeout(() => { setNoteText(''); setNoteSending(false); toast('ההודעה נשלחה למנהל!', 'success'); }, 600);
  };

  // ===== Swap request =====
  const handleSwapRequest = () => {
    if (!showSwapModal) return;
    dispatch({ type: 'ADD_SWAP_REQUEST', payload: { id: `sr${Date.now()}`, empId: emp.id, fromShiftDefId: showSwapModal.shiftDefId, fromDayIdx: showSwapModal.dayIdx, reason: swapReason, status: 'pending', weekKey, timestamp: new Date().toISOString() } });
    dispatch({ type: 'ADD_NOTIFICATION', payload: { id: `n${Date.now()}`, text: `${emp.name} ביקש/ה החלפת משמרת`, type: 'warning', timestamp: new Date().toISOString(), read: false } });
    setShowSwapModal(null); setSwapReason('');
    toast('בקשת ההחלפה נשלחה למנהל!', 'success');
  };

  return (
    <div className="worker-portal">

      {/* ===== HEADER ===== */}
      <div className="wp-header glass-panel">
        <div className="wp-user-info">
          <div className="wp-avatar" style={{ borderColor: ROLE_COLORS[emp.roles?.[0]] || '#3b82f6' }}>
            {emp.avatar}
          </div>
          <div>
            <h2>שלום, {emp.name}!</h2>
            <p className="wp-role">{emp.roles.join(', ')}</p>
          </div>
        </div>
        <div className="wp-stats">
          {/* Shift ratio badge: adminQuota / workerAvailableDays */}
          <div className="wp-ratio-badge">
            <span className="wp-ratio-num">{requestedQuota}</span>
            <span className="wp-ratio-sep">/</span>
            <span className="wp-ratio-den">{availableDays}</span>
            <span className="wp-ratio-label">מכסה / ימים זמינים</span>
          </div>
          <div className={`wp-stat-card ${shiftCount >= MAX_SHIFTS ? 'stat-done-card' : ''}`}>
            <CalendarCheck size={18} />
            <div className="wp-stat-body">
              <span className="wp-stat-num">{shiftCount}</span>
              <span className="wp-stat-label">משמרות השבוע</span>
            </div>
          </div>
          <div className="wp-quota-bar-wrap">
            <span className="wp-quota-bar-label">{shiftCount}/{MAX_SHIFTS}</span>
            <div className="wp-quota-track">
              <div
                className={`wp-quota-fill ${shiftCount >= MAX_SHIFTS ? 'full' : shiftCount === MAX_SHIFTS - 1 ? 'near' : ''}`}
                style={{ width: `${Math.min((shiftCount / MAX_SHIFTS) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lock Notice */}
      {isLocked && (
        <div className="wp-lock-notice">
          <Lock size={16} />
          <span>הסידור נעול – לא ניתן לבקש שינויים כרגע</span>
        </div>
      )}

      {/* Week Navigation */}
      <div className="wp-week-nav glass-panel">
        <button className="icon-btn" onClick={() => dispatch({ type: 'SET_WEEK_OFFSET', payload: weekOffset + 1 })}>
          <ChevronRight size={20} />
        </button>
        <span className="wp-week-label">{weekLabel}</span>
        <button className="icon-btn" onClick={() => dispatch({ type: 'SET_WEEK_OFFSET', payload: weekOffset - 1 })}>
          <ChevronLeft size={20} />
        </button>
      </div>

      {/* ===== TABS ===== */}
      <div className="wp-tabs">
        <button
          className={`wp-tab ${activeTab === 'my-shifts' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-shifts')}
        >
          <CalendarCheck size={16} />
          <span>המשמרות שלי</span>
          {shiftCount > 0 && <span className="wp-tab-badge">{shiftCount}</span>}
        </button>
        <button
          className={`wp-tab ${activeTab === 'my-requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-requests')}
        >
          <Send size={16} />
          <span>הבקשות שלי</span>
          {existingRequest && <span className="wp-tab-badge sent">✓</span>}
        </button>
      </div>

      {/* ===== TWO-COLUMN LAYOUT ===== */}
      <div className="wp-main-layout">

        {/* LEFT: Tab content */}
        <div className="wp-left-col">

          {/* ====== TAB 1: MY SHIFTS — Week table with only relevant shifts ====== */}
          {activeTab === 'my-shifts' && (
            <section className="wp-section">
              <div className="wp-section-header-row">
                <h3 className="wp-section-title">📅 המשמרות שלי</h3>
                <div className="wp-shift-ratio-pill">
                  <span className="wp-srp-label">מכסה</span>
                  <span className="wp-srp-num">{requestedQuota}</span>
                  <span className="wp-srp-sep">/</span>
                  <span className="wp-srp-den">{availableDays}</span>
                  <span className="wp-srp-label">ימים</span>
                </div>
              </div>

              {myShiftDefs.length === 0 ? (
                <div className="wp-empty-state">
                  <CalendarCheck size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <span>לא משובץ/ת לשבוע זה עדיין</span>
                  <p style={{ fontSize: '0.75rem', marginTop: 4, opacity: 0.6 }}>המנהל ישבץ אותך בקרוב</p>
                </div>
              ) : (
                <div className="wp-self-table-wrapper">
                  <table className="wp-request-table wp-shifts-table">
                    <thead>
                      <tr>
                        {weekDays.map(d => (
                          <th key={d.idx} className="wp-req-day-col wp-shifts-day-col">
                            <span className="wp-th-name">{d.name}</span>
                            <span className="wp-th-date">{d.date}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {weekDays.map(day => {
                          const assignments = myShifts.filter(s => s.dayIdx === day.idx);
                          return (
                            <td key={day.idx} className={`wp-req-cell ${assignments.length > 0 ? 'wp-shift-assigned' : ''}`}>
                              {assignments.length > 0 ? (
                                <div className="wp-assignments-stack">
                                  {assignments.map(assignment => {
                                    const def = shiftDefs.find(d => d.id === assignment.shiftDefId);
                                    if (!def) return null;
                                    const info = getShiftForDay(def, day.idx);
                                    return (
                                      <div key={assignment.id} className="wp-assigned-chip" style={{ borderColor: def.color }}>
                                        <div className="wp-ac-name">{info?.name || def.name}</div>
                                        <div className="wp-ac-hours" style={{ direction: 'ltr', unicodeBidi: 'embed' }}>
                                          {info?.hours || def.hours}
                                        </div>
                                        {!isLocked && (
                                          <div className="wp-ac-actions">
                                            <button
                                              className="wp-ac-swap"
                                              title="בקשת החלפה"
                                              onClick={() => setShowSwapModal({ dayIdx: day.idx, shiftDefId: def.id, assignmentId: assignment.id })}
                                            >
                                              <ArrowLeftRight size={10} />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="wp-shift-empty">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {shiftCount >= MAX_SHIFTS && (
                <div className="wp-quota-reached glass-panel">
                  <CheckCircle2 size={20} className="wp-qr-icon" />
                  <div>
                    <strong>מכסה מלאה!</strong>
                    <p>{shiftCount} משמרות מתוך {MAX_SHIFTS}</p>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ====== TAB 2: MY REQUESTS — Reservation table 3×7 ====== */}
          {activeTab === 'my-requests' && (
            <section className="wp-section">
              <div className="wp-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 className="wp-section-title">📝 הבקשות שלי</h3>
                  <p className="wp-section-desc">
                    מכסת משמרות: {MAX_SHIFTS}. ניתן לחסום יום אחד + עוד {MAX_BLOCKED_SLOTS} משמרות.
                  </p>
                </div>
                <div className="wp-quota-selector">
                  <span className="wp-qs-label">▼ מספר משמרות:</span>
                  <select className="wp-qs-dropdown" value={requestedQuota} onChange={(e) => setRequestedQuota(Number(e.target.value))}>
                    {[...Array(8)].map((_, i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Blocking counters */}
              <div className="wp-req-counters">
                <span className={`wp-counter ${blockedDay !== null ? 'maxed' : ''}`}>
                  🚫 ימים חסומים: {blockedDay !== null ? 1 : 0}/1
                </span>
                <span className={`wp-counter ${blockedSlots.length >= MAX_BLOCKED_SLOTS ? 'maxed' : ''}`}>
                  ⚠️ משמרות חסומות: {blockedSlots.length}/{MAX_BLOCKED_SLOTS}
                </span>
                <span className="wp-counter wp-counter-info">
                  ✅ זמין/ה: {availableSlots}/{totalSlots}
                </span>
              </div>

              <div className="wp-self-table-wrapper">
                <table className="wp-request-table">
                  <thead>
                    <tr>
                      <th className="wp-req-shift-col">משמרות</th>
                      {weekDays.map(d => (
                        <th
                          key={d.idx}
                          className={`wp-req-day-col ${blockedDay === d.idx ? 'is-blocked-col' : ''}`}
                          onClick={() => toggleBlockDay(d.idx)}
                          title={blockedDay === d.idx ? "בטל חסימת יום" : "חסום יום שלם"}
                        >
                          <span className="wp-th-name">{d.name}</span>
                          <span className="wp-th-date">{d.date}</span>
                          <div className="wp-block-day-btn">
                            {blockedDay === d.idx ? 'שחרר יום' : 'חסום יום'}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {RESERVATION_SLOTS.map(slot => (
                      <tr key={slot.id}>
                        <td className="wp-req-shift-label">
                          <span className="wp-st-dot" style={{ background: slot.color }} />
                          <div>
                            <span className="wp-st-name">{slot.name}</span>
                            <span className="wp-st-hours" style={{ direction: 'ltr', unicodeBidi: 'embed' }}>{slot.hours}</span>
                          </div>
                        </td>
                        {weekDays.map(day => {
                          const cellState = getCellState(day.idx, slot.id);
                          return (
                            <td
                              key={day.idx}
                              className="wp-req-cell wp-btn-cell"
                              onClick={() => cycleCellState(day.idx, slot.id)}
                            >
                              <div className={`wp-req-btn ${
                                cellState === 'blocked-day' ? 'btn-blocked' :
                                cellState === 'blocked-slot' ? 'btn-prefer-not' :
                                'btn-can'
                              }`}>
                                {cellState === 'available' ? 'יכול/ה' : 'לא יכול/ה'}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="wp-request-footer glass-panel">
                <div className="wp-rf-left">
                  <label>הערות נוספות לבקשה:</label>
                  <input
                    type="text"
                    placeholder="הקלד כאן בקשות מיוחדות, ימי חופש רחוקים וכו'..."
                    value={requestComment}
                    onChange={(e) => setRequestComment(e.target.value)}
                    maxLength={150}
                  />
                </div>
                <div className="wp-rf-right">
                  {existingRequest && <span className="wp-already-sent">✓ בקשה נשלחה</span>}
                  <button
                    className={`btn-primary wp-submit-req-btn ${requestSending ? 'sending' : ''}`}
                    onClick={handleSubmitRequest}
                    disabled={requestSending || isLocked}
                  >
                    <Send size={16} />
                    <span>{existingRequest ? 'עדכן בקשה' : 'שלח בקשה שבועית'}</span>
                  </button>
                </div>
              </div>

              {/* Swap request history */}
              {myRequests.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4 className="wp-section-title" style={{ fontSize: '0.9rem' }}>📋 היסטוריית בקשות החלפה</h4>
                  <div className="wp-requests-list">
                    {myRequests.map(req => {
                      const def = shiftDefs.find(d => d.id === req.fromShiftDefId);
                      const dayName = DAY_NAMES[req.fromDayIdx] || '?';
                      return (
                        <div key={req.id} className={`wp-request-item status-${req.status}`}>
                          <div className="wp-req-icon">
                            {req.status === 'pending' ? '⏳' : req.status === 'approved' ? '✅' : '❌'}
                          </div>
                          <div className="wp-req-info">
                            <span>החלפת {def?.name} ביום {dayName}</span>
                            {req.reason && <span className="wp-req-reason">{req.reason}</span>}
                          </div>
                          <span className="wp-req-status">
                            {req.status === 'pending' ? 'ממתין' : req.status === 'approved' ? 'אושר' : 'נדחה'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* RIGHT: Problem/note box */}
        <div className="wp-right-col">
          <section className="wp-section wp-note-section glass-panel">
            <div className="wp-note-header">
              <MessageSquareMore size={20} className="wp-note-icon" />
              <div>
                <h3 className="wp-note-title">פניה למנהל</h3>
                <p className="wp-note-desc">שלח/י בקשה, דיווח על בעיה, או כל הודעה למנהל</p>
              </div>
            </div>
            <textarea
              className="wp-note-textarea"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="למשל: אני לא יכול/ה ביום רביעי בשבוע הבא, צריכ/ה שינוי משמרת, יש לי בעיית נסיעות..."
              rows={5}
              maxLength={400}
            />
            <div className="wp-note-footer">
              <span className="wp-note-chars">{noteText.length}/400</span>
              <button
                className={`wp-send-btn ${noteSending ? 'sending' : ''}`}
                onClick={handleSendNote}
                disabled={!noteText.trim() || noteSending}
              >
                <Send size={16} />
                <span>{noteSending ? 'שולח...' : 'שלח למנהל'}</span>
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Swap Modal */}
      {showSwapModal && (
        <Modal title="בקשת החלפת משמרת" onClose={() => { setShowSwapModal(null); setSwapReason(''); }} width="400px">
          <div className="modal-form">
            <p className="modal-text">הבקשה תישלח למנהל לאישור. ניתן להוסיף סיבה.</p>
            <label>סיבה (אופציונלי):</label>
            <textarea value={swapReason} onChange={e => setSwapReason(e.target.value)} placeholder="למשל: אילוץ אישי, בעיית הסעה..." rows={3} />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => { setShowSwapModal(null); setSwapReason(''); }}>ביטול</button>
              <button className="btn-primary" onClick={handleSwapRequest}>שלח בקשה</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
