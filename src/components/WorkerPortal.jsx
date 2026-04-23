import React, { useState } from 'react';
import { useApp, getWeekKey } from '../context/AppContext';
import { useToast } from './ui/Toast';
import Modal from './ui/Modal';
import { getWeekDays, getWeekLabel, getShiftForDay, ROLE_COLORS } from '../data/initialData';
import {
  Clock, Lock, ArrowLeftRight, ChevronRight, ChevronLeft,
  CalendarCheck, AlertCircle, Plus, CheckCircle2, Send, MessageSquareMore
} from 'lucide-react';
import './WorkerPortal.css';

export default function WorkerPortal() {
  const { state, dispatch, weekKey, getWorkerShiftCount } = useApp();
  const toast = useToast();
  const { currentUser, employees, shiftDefs, assignments, isLocked, swapRequests, weekOffset } = state;

  const emp = employees.find(e => e.id === currentUser?.id);

  const [showSwapModal, setShowSwapModal] = useState(null);
  const [swapReason, setSwapReason] = useState('');
  const [noteText, setNoteText] = useState('');
  const [noteSending, setNoteSending] = useState(false);

  // New Request Form State
  const [blockedDay, setBlockedDay] = useState(null);
  const [preferNot, setPreferNot] = useState([]); // Array of {dayIdx, shiftDefId}
  const [requestComment, setRequestComment] = useState('');
  const [requestSending, setRequestSending] = useState(false);
  const [requestedQuota, setRequestedQuota] = useState(emp?.quota ?? 5);
  if (!emp) return <div className="worker-portal"><h2>עובד לא נמצא</h2></div>;

  const weekDays = getWeekDays(weekOffset);
  const weekLabel = getWeekLabel(weekOffset);
  const myShifts = assignments.filter(a => a.empId === emp.id && a.weekKey === weekKey);
  const myRequests = swapRequests.filter(r => r.empId === emp.id);
  const shiftCount = myShifts.length;
  const remaining = emp.quota - shiftCount;

  // ===== Self-Schedule: Build available shift table =====
  // For each shift def the worker is eligible for, show which days are open (active + not locked + worker not already there)
  const eligibleDefs = shiftDefs.filter(d => emp.eligibleShifts.includes(d.id));

  const isAlreadyAssigned = (shiftDefId, dayIdx) =>
    assignments.some(a => a.empId === emp.id && a.shiftDefId === shiftDefId && a.dayIdx === dayIdx && a.weekKey === weekKey);

  const hasDayConflict = (dayIdx) =>
    assignments.some(a => a.empId === emp.id && a.dayIdx === dayIdx && a.weekKey === weekKey);

  const handleSelfAssign = (shiftDefId, dayIdx) => {
    if (isLocked) { toast('הסידור נעול', 'warning'); return; }
    if (remaining <= 0) { toast('הגעת למכסה השבועית שלך!', 'warning'); return; }
    if (isAlreadyAssigned(shiftDefId, dayIdx)) { toast('כבר רשום/ה למשמרת זו', 'warning'); return; }
    if (hasDayConflict(dayIdx)) { toast('כבר יש לך משמרת ביום זה', 'warning'); return; }
    dispatch({ type: 'ASSIGN_WORKER', payload: { id: `s${Date.now()}`, empId: emp.id, dayIdx, shiftDefId, weekKey } });
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: { id: `n${Date.now()}`, text: `${emp.name} נרשם/ה למשמרת ${shiftDefs.find(d => d.id === shiftDefId)?.name || ''} יום ${['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'][dayIdx]}`, type: 'info', timestamp: new Date().toISOString(), read: false }
    });
    toast('נרשמת למשמרת!', 'success');
  };

  const handleSelfRemove = (assignmentId) => {
    if (isLocked) { toast('הסידור נעול', 'warning'); return; }
    dispatch({ type: 'REMOVE_ASSIGNMENT', payload: assignmentId });
    toast('הוסרת מהמשמרת', 'info');
  };

  // ===== New Request System =====
  
  const toggleBlockDay = (dayIdx) => {
    if (blockedDay === dayIdx) {
      setBlockedDay(null); // Unblock
    } else {
      setBlockedDay(dayIdx); // Block this day (replaces previous, since only 1 allowed)
      // Remove any preferNot slots on this day since the whole day is now blocked
      setPreferNot(prev => prev.filter(p => p.dayIdx !== dayIdx));
    }
  };

  const cycleCellState = (dayIdx, shiftDefId) => {
    // If day is entirely blocked, ignore individual clicks
    if (blockedDay === dayIdx) return;
    
    const isPreferNot = preferNot.some(p => p.dayIdx === dayIdx && p.shiftDefId === shiftDefId);
    
    if (isPreferNot) {
      // Cycle from "prefer not" -> back to "can"
      setPreferNot(prev => prev.filter(p => !(p.dayIdx === dayIdx && p.shiftDefId === shiftDefId)));
    } else {
      // Cylce from "can" -> "prefer not"
      if (preferNot.length >= 4) {
        toast('ניתן לסמן עד 4 משמרות כ"עדיף שלא"', 'warning');
        return;
      }
      setPreferNot(prev => [...prev, { dayIdx, shiftDefId }]);
    }
  };

  const handleSubmitRequest = () => {
    setRequestSending(true);

    const newReq = {
      id: `req_${Date.now()}`,
      empId: emp.id,
      weekKey,
      blockedDay,
      preferNotSlots: preferNot,
      comment: requestComment.trim(),
      requestedQuota: requestedQuota,
      shiftCount: shiftCount,
      timestamp: new Date().toISOString()
    };

    // Replace if already exists for this week
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

  // Check if current user has already submitted a request for this week
  const existingRequest = state.shiftRequests.find(r => r.empId === emp.id && r.weekKey === weekKey);

  // ===== Problem/Note submission =====
  const handleSendNote = () => {
    if (!noteText.trim()) return;
    setNoteSending(true);
    const note = {
      id: `wn${Date.now()}`,
      empId: emp.id,
      empName: emp.name,
      text: noteText.trim(),
      timestamp: new Date().toISOString(),
      read: false
    };
    dispatch({ type: 'ADD_WORKER_NOTE', payload: note });
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: { id: `n${Date.now()}`, text: `הודעה מ-${emp.name}: ${noteText.slice(0, 50)}...`, type: 'info', timestamp: new Date().toISOString(), read: false }
    });
    setTimeout(() => {
      setNoteText('');
      setNoteSending(false);
      toast('ההודעה נשלחה למנהל!', 'success');
    }, 600);
  };

  // ===== Swap request =====
  const handleSwapRequest = () => {
    if (!showSwapModal) return;
    dispatch({
      type: 'ADD_SWAP_REQUEST',
      payload: { id: `sr${Date.now()}`, empId: emp.id, fromShiftDefId: showSwapModal.shiftDefId, fromDayIdx: showSwapModal.dayIdx, reason: swapReason, status: 'pending', weekKey, timestamp: new Date().toISOString() }
    });
    dispatch({ type: 'ADD_NOTIFICATION', payload: { id: `n${Date.now()}`, text: `${emp.name} ביקש/ה החלפת משמרת`, type: 'warning', timestamp: new Date().toISOString(), read: false } });
    setShowSwapModal(null);
    setSwapReason('');
    toast('בקשת ההחלפה נשלחה למנהל!', 'success');
  };

  // Weekly schedule by day
  const scheduleByDay = weekDays.map(day => ({
    day,
    shifts: myShifts.filter(s => s.dayIdx === day.idx)
  }));

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
          <div className="wp-stat-card">
            <CalendarCheck size={18} />
            <div className="wp-stat-body">
              <span className="wp-stat-num">{shiftCount}</span>
              <span className="wp-stat-label">משמרות השבוע</span>
            </div>
          </div>
          <div className={`wp-stat-card ${remaining <= 0 ? 'stat-done-card' : remaining === 1 ? 'stat-warn-card' : ''}`}>
            <Clock size={18} />
            <div className="wp-stat-body">
              <span className={`wp-stat-num ${remaining <= 0 ? 'stat-done' : remaining === 1 ? 'stat-warn' : ''}`}>
                {remaining > 0 ? remaining : 0}
              </span>
              <span className="wp-stat-label">נותרו ממכסה ({emp.quota})</span>
            </div>
          </div>
          {/* Quota progress bar */}
          <div className="wp-quota-bar-wrap">
            <span className="wp-quota-bar-label">{shiftCount}/{emp.quota}</span>
            <div className="wp-quota-track">
              <div
                className={`wp-quota-fill ${shiftCount >= emp.quota ? 'full' : shiftCount === emp.quota - 1 ? 'near' : ''}`}
                style={{ width: `${Math.min((shiftCount / emp.quota) * 100, 100)}%` }}
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

      {/* ===== TWO-COLUMN LAYOUT ===== */}
      <div className="wp-main-layout">

        {/* LEFT: My schedule + self-assign table */}
        <div className="wp-left-col">

          {/* My Current Shifts */}
          <section className="wp-section">
            <h3 className="wp-section-title">📅 המשמרות שלי השבוע</h3>
            <div className="wp-my-shifts-list">
              {scheduleByDay.every(d => d.shifts.length === 0) && (
                <div className="wp-empty-state">
                  <span>לא משובץ/ת לשבוע זה עדיין</span>
                </div>
              )}
              {scheduleByDay.map(({ day, shifts }) => shifts.length > 0 && (
                <div key={day.idx} className="wp-my-shift-row">
                  <div className="wp-my-day-label">
                    <span className="wp-myl-name">{day.name}</span>
                    <span className="wp-myl-date">{day.date}</span>
                  </div>
                  <div className="wp-my-shift-cards">
                    {shifts.map(s => {
                      const def = shiftDefs.find(d => d.id === s.shiftDefId);
                      const info = def ? getShiftForDay(def, day.idx) : null;
                      return (
                        <div key={s.id} className="wp-shift-pill" style={{ borderColor: def?.color || '#3b82f6' }}>
                          <span className="wp-pill-dot" style={{ background: def?.color || '#3b82f6' }} />
                          <div className="wp-pill-text">
                            <span className="wp-pill-name">{info?.name || def?.name}</span>
                            <span className="wp-pill-hours" style={{ direction: 'ltr', unicodeBidi: 'embed' }}>
                              {info?.hours || def?.hours}
                            </span>
                          </div>
                          {!isLocked && (
                            <div className="wp-pill-actions">
                              <button className="wp-mini-btn swap" onClick={() => setShowSwapModal({ dayIdx: day.idx, shiftDefId: s.shiftDefId, assignmentId: s.id })}>
                                <ArrowLeftRight size={12} /> החלפה
                              </button>
                              <button className="wp-mini-btn remove" onClick={() => handleSelfRemove(s.id)}>
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Weekly Request Grid */}
          {!isLocked && (
            <section className="wp-section">
              <div className="wp-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 className="wp-section-title">בקשות {emp.name}</h3>
                  <p className="wp-section-desc">סמן זמינות לשבוע. ניתן לחסום יום אחד שלם ועוד 4 משמרות כספציפיות.</p>
                </div>
                <div className="wp-quota-selector">
                  <span className="wp-qs-label">מספר משמרות:</span>
                  <select className="wp-qs-dropdown" value={requestedQuota} onChange={(e) => setRequestedQuota(Number(e.target.value))}>
                    {[...Array(8)].map((_, i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="wp-request-tools" style={{ display: 'none' }}>
                 <div className="wp-req-counters">
                   <span className={`wp-counter ${blockedDay !== null ? 'maxed' : ''}`}>
                     ימים חסומים: {blockedDay !== null ? 1 : 0}/1
                   </span>
                   <span className={`wp-counter ${preferNot.length >= 4 ? 'maxed' : ''}`}>
                     מעדיף לא: {preferNot.length}/4
                   </span>
                 </div>
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
                    {eligibleDefs.map(def => (
                      <tr key={def.id}>
                        <td className="wp-req-shift-label">
                          <span className="wp-st-dot" style={{ background: def.color }} />
                          <div>
                            <span className="wp-st-name">{def.name}</span>
                            <span className="wp-st-hours" style={{ direction: 'ltr', unicodeBidi: 'embed' }}>{def.hours}</span>
                          </div>
                        </td>
                        {weekDays.map(day => {
                          const info = getShiftForDay(def, day.idx);
                          const inactive = !info;
                          const isDayBlocked = blockedDay === day.idx;
                          const isPreferNot = preferNot.some(p => p.dayIdx === day.idx && p.shiftDefId === def.id);

                          return (
                            <td 
                              key={day.idx} 
                              className={`wp-req-cell wp-btn-cell ${inactive ? 'cell-inactive' : ''}`}
                              onClick={() => { if (!inactive) cycleCellState(day.idx, def.id); }}
                            >
                              {!inactive && (
                                <div className={`wp-req-btn ${isDayBlocked ? 'btn-blocked' : isPreferNot ? 'btn-prefer-not' : 'btn-can'}`}>
                                  {isDayBlocked ? 'לא יכול/ה' : isPreferNot ? 'עדיף שלא' : 'יכול/ה'}
                                </div>
                              )}
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
                  {existingRequest && <span className="wp-already-sent">✓ בקשה כבר נשלחה לשבוע זה</span>}
                  <button 
                    className={`btn-primary wp-submit-req-btn ${requestSending ? 'sending' : ''}`}
                    onClick={handleSubmitRequest}
                    disabled={requestSending}
                  >
                    <Send size={16} /> 
                    <span>{existingRequest ? 'עדכן בקשה' : 'שלח בקשה שבועית'}</span>
                  </button>
                </div>
              </div>
            </section>
          )}

          {remaining <= 0 && !isLocked && (
            <div className="wp-quota-reached glass-panel">
              <CheckCircle2 size={24} className="wp-qr-icon" />
              <div>
                <strong>הגעת למכסה השבועית שלך!</strong>
                <p>שובצת {shiftCount} משמרות מתוך {emp.quota}. כל הכבוד!</p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Problem/note box + request history */}
        <div className="wp-right-col">

          {/* Problem / Needs Text Box */}
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

          {/* Request History */}
          {myRequests.length > 0 && (
            <section className="wp-section">
              <h3 className="wp-section-title">📋 היסטוריית בקשות</h3>
              <div className="wp-requests-list">
                {myRequests.map(req => {
                  const def = shiftDefs.find(d => d.id === req.fromShiftDefId);
                  const dayName = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'][req.fromDayIdx] || '?';
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
            </section>
          )}
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
