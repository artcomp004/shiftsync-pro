import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp, getWeekKey } from '../context/AppContext';
import { getWeekDays, getWeekLabel, getShiftForDay, ROLE_COLORS } from '../data/initialData';
import { useToast } from './ui/Toast';
import Modal from './ui/Modal';
import {
  ChevronRight, ChevronLeft, Sparkles, UserPlus, Printer, Send, Edit3, X,
  Search, Lock, Unlock, Download, Layers, Palette, RefreshCw, ClipboardList
} from 'lucide-react';
import './ScheduleGrid.css';

export default function ScheduleGrid() {
  const { state, dispatch, weekKey, getWorkerShiftCount } = useApp();
  const toast = useToast();
  const { employees, shiftDefs, assignments, weekOffset, isLocked, cellNotes, currentUser, multiWeek, workerNotes, shiftRequests } = state;
  const isAdmin = currentUser?.role === 'admin';

  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [showShiftDefsEditor, setShowShiftDefsEditor] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuotaEmp, setSelectedQuotaEmp] = useState(null);
  const [cellNoteEditor, setCellNoteEditor] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [noteColor, setNoteColor] = useState('');
  const [showShiftRequestsPanel, setShowShiftRequestsPanel] = useState(false);
  const [dragData, setDragData] = useState(null);
  // Chip replace dropdown
  const [replaceDropdown, setReplaceDropdown] = useState(null); // { assignmentId, empId, dayIdx, shiftDefId, wk }
  const [replaceSearch, setReplaceSearch] = useState('');

  const gridRef = useRef(null);
  const [newWorker, setNewWorker] = useState({ name: '', email: '', phone: '', roles: ['שוטף'], quota: 5, eligibleShifts: [] });

  const weekDays = getWeekDays(weekOffset);
  const weekLabel = getWeekLabel(weekOffset);
  const weekDays2 = multiWeek ? getWeekDays(weekOffset + 1) : [];
  const weekKey2 = multiWeek ? getWeekKey(weekOffset + 1) : null;

  const getAssignmentsForCell = (dayIdx, shiftDefId, wk) => {
    return assignments.filter(a => a.dayIdx === dayIdx && a.shiftDefId === shiftDefId && a.weekKey === wk);
  };

  const getCellKey = (wk, dayIdx, shiftDefId) => `${wk}_${dayIdx}_${shiftDefId}`;

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.shift-dropdown-container') && !e.target.closest('.add-assignment-btn')) {
        setActiveDropdown(null);
      }
      if (!e.target.closest('.replace-dropdown-container') && !e.target.closest('.assigned-chip')) {
        setReplaceDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard shortcuts (Ctrl+S save, Ctrl+P print)
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSaveSchedule(); }
      if (e.ctrlKey && e.key === 'p') { e.preventDefault(); handlePrint(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [assignments]);

  // --- Shift Need & Quota Calculation ---
  const activeEmployees = employees.filter(e => e.active);
  let totalRequiredShifts = 0;
  shiftDefs.forEach(def => {
    weekDays.forEach(day => {
      const info = getShiftForDay(def, day.idx);
      if (info) totalRequiredShifts += 1; // Assuming 1 worker per shift
    });
  });

  const totalQuota = activeEmployees.reduce((sum, emp) => sum + emp.quota, 0);
  const quotaDifference = totalQuota - totalRequiredShifts;
  
  // Create a sorted copy of shift defs to highlight certain shifts visually if we have a deficit
  // This satisfies the "add a way to prioritise shifts" logic purely visually, without blocking the AI.
  const priorityMode = quotaDifference < 0;

  const renderManagementSummary = () => {
    if (!isAdmin) return null;
    return (
      <div className="admin-summary-banner glass-panel no-print">
        <div className="asb-main">
          <div className="asb-stat">
            <span className="asb-label">משמרות לאיוש שבועיות:</span>
            <span className="asb-val">{totalRequiredShifts}</span>
          </div>
          <div className="asb-stat">
            <span className="asb-label">סך מכסות עובדים פעילים:</span>
            <span className="asb-val">{totalQuota}</span>
          </div>
          <div className={`asb-stat asb-diff ${quotaDifference < 0 ? 'deficit' : quotaDifference > 0 ? 'surplus' : 'balanced'}`}>
            <span className="asb-label">{quotaDifference < 0 ? 'חוסר במשמרות:' : quotaDifference > 0 ? 'עודף עובדים:' : 'מאוזן'}</span>
            <span className="asb-val" style={{color: quotaDifference < 0 ? 'var(--error)' : 'var(--success)'}}>
              {Math.abs(quotaDifference)}
            </span>
          </div>
        </div>
        <div className="asb-managers">מנהלים אחראים: ארי, עירית</div>
      </div>
    );
  };

  // ===== ACTIONS =====

  const handleAutoSchedule = () => {
    if (isLocked) { toast('הסידור נעול! בטל נעילה לפני שיבוץ.', 'warning'); return; }
    setIsGenerating(true);
    setTimeout(() => {
      let tempShifts = [...assignments.filter(a => a.weekKey !== weekKey)];
      let counter = Date.now();
      let conflictsAvoided = 0;

      // Build request map for this week
      const requestMap = {};
      shiftRequests.filter(r => r.weekKey === weekKey).forEach(req => {
        requestMap[req.empId] = req;
      });

      shiftDefs.forEach(def => {
        weekDays.forEach(day => {
          const info = getShiftForDay(def, day.idx);
          if (!info) return;

          const eligibleWorkers = employees.filter(e => e.active && e.eligibleShifts.includes(def.id));

          // Score each worker (higher = better candidate)
          const scored = eligibleWorkers.map(emp => {
            const assignedCountWeek = tempShifts.filter(s => s.empId === emp.id && s.weekKey === weekKey).length;
            const remaining = emp.quota - assignedCountWeek;
            const alreadyHere = tempShifts.some(s => s.empId === emp.id && s.dayIdx === day.idx && s.weekKey === weekKey && s.shiftDefId === def.id);
            const dayConflict = tempShifts.some(s => s.empId === emp.id && s.dayIdx === day.idx && s.weekKey === weekKey);

            // Check shift request constraints
            const req = requestMap[emp.id];
            const isDayBlocked = req?.blockedDay === day.idx;
            const isPreferNot = req?.preferNotSlots?.some(sl => sl.dayIdx === day.idx && sl.shiftDefId === def.id);

            if (alreadyHere || remaining <= 0 || dayConflict) return { emp, score: -1 };
            if (isDayBlocked) { conflictsAvoided++; return { emp, score: -1 }; }

            // Score: higher remaining quota = higher priority, prefer-not = penalty
            let score = remaining * 10;
            if (isPreferNot) { score -= 5; conflictsAvoided++; }
            // Add randomness to break ties
            score += Math.random() * 3;

            return { emp, score };
          });

          // Sort by score descending, pick best candidate
          scored.sort((a, b) => b.score - a.score);

          const best = scored.find(s => s.score > 0);
          if (best) {
            tempShifts.push({ id: `s${counter++}`, empId: best.emp.id, dayIdx: day.idx, shiftDefId: def.id, weekKey });
          }
        });
      });

      dispatch({ type: 'SET_ASSIGNMENTS', payload: tempShifts });
      setIsGenerating(false);

      const filled = tempShifts.filter(s => s.weekKey === weekKey).length;
      toast(`שיבוץ AI הושלם! ${filled} משמרות שובצו${conflictsAvoided > 0 ? `, ${conflictsAvoided} בקשות עובדים כובדו` : ''}`, 'success');
    }, 2200);
  };

  // Print: use native browser print with landscape A4
  const handlePrint = () => {
    window.print();
  };

  const handleCSVExport = () => {
    const header = ['יום', 'תאריך', 'משמרת', 'שעות', 'עובדים'];
    const rows = [];
    shiftDefs.forEach(def => {
      weekDays.forEach(day => {
        const info = getShiftForDay(def, day.idx);
        if (!info) return;
        const cellAssign = getAssignmentsForCell(day.idx, def.id, weekKey);
        const names = cellAssign.map(a => employees.find(e => e.id === a.empId)?.name || '').join(' | ');
        rows.push([day.name, day.date, info.name, info.hours, names]);
      });
    });
    const csv = '\uFEFF' + [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `schedule-${weekLabel}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast('קובץ CSV יוצא!', 'success');
  };

  const handleSaveSchedule = () => {
    const weekAssignments = assignments.filter(a => a.weekKey === weekKey);
    dispatch({
      type: 'SAVE_SCHEDULE',
      payload: {
        id: `sched_${Date.now()}`,
        weekLabel,
        weekKey,
        assignments: weekAssignments,
        cellNotes: Object.fromEntries(Object.entries(cellNotes).filter(([k]) => k.startsWith(weekKey))),
        savedAt: new Date().toISOString()
      }
    });
    toast('הסידור נשמר לארכיון!', 'success');
  };

  const toggleDropdown = (dayIdx, shiftDefId, wk) => {
    setSearchTerm('');
    setReplaceDropdown(null);
    if (activeDropdown?.dayIdx === dayIdx && activeDropdown?.shiftDefId === shiftDefId && activeDropdown?.wk === wk) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown({ dayIdx, shiftDefId, wk });
    }
  };

  const assignWorker = (empId, dayIdx, shiftDefId, wk) => {
    // One employee per shift — check if cell is already occupied
    const cellOccupied = assignments.find(a => a.dayIdx === dayIdx && a.shiftDefId === shiftDefId && a.weekKey === wk);
    if (cellOccupied) {
      toast('כבר יש עובד במשמרת זו — לחץ על העובד להחלפה', 'warning');
      return;
    }
    if (assignments.some(a => a.empId === empId && a.dayIdx === dayIdx && a.shiftDefId === shiftDefId && a.weekKey === wk)) {
      toast('העובד כבר משובץ כאן', 'warning');
      return;
    }
    dispatch({ type: 'ASSIGN_WORKER', payload: { id: `s${Date.now()}`, empId, dayIdx, shiftDefId, weekKey: wk } });
    setActiveDropdown(null);
  };

  const removeShift = (assignmentId) => {
    if (isLocked && !isAdmin) return;
    dispatch({ type: 'REMOVE_ASSIGNMENT', payload: assignmentId });
  };

  // Replace worker in a chip
  const handleReplaceWorker = (oldAssignmentId, newEmpId, dayIdx, shiftDefId, wk) => {
    // Remove old
    dispatch({ type: 'REMOVE_ASSIGNMENT', payload: oldAssignmentId });
    // Add new
    dispatch({ type: 'ASSIGN_WORKER', payload: { id: `s${Date.now()}`, empId: newEmpId, dayIdx, shiftDefId, weekKey: wk } });
    setReplaceDropdown(null);
    toast('עובד הוחלף!', 'success');
  };

  const openReplaceDropdown = (assignment) => {
    setActiveDropdown(null);
    setReplaceSearch('');
    if (replaceDropdown?.assignmentId === assignment.id) {
      setReplaceDropdown(null);
    } else {
      setReplaceDropdown({
        assignmentId: assignment.id,
        empId: assignment.empId,
        dayIdx: assignment.dayIdx,
        shiftDefId: assignment.shiftDefId,
        wk: assignment.weekKey || weekKey
      });
    }
  };

  const handleAddWorkerSubmit = (e) => {
    e.preventDefault();
    if (newWorker.name.trim() === '') return;
    dispatch({
      type: 'ADD_EMPLOYEE',
      payload: {
        id: `e${Date.now()}`,
        name: newWorker.name,
        email: newWorker.email,
        phone: newWorker.phone,
        roles: newWorker.roles,
        eligibleShifts: newWorker.eligibleShifts.length > 0 ? newWorker.eligibleShifts : shiftDefs.map(d => d.id),
        avatar: newWorker.name.charAt(0),
        quota: parseInt(newWorker.quota) || 5,
        active: true
      }
    });
    setShowAddWorker(false);
    setNewWorker({ name: '', email: '', phone: '', roles: ['שוטף'], quota: 5, eligibleShifts: [] });
    toast('עובד חדש נוסף!', 'success');
  };

  const handleCellNoteOpen = (dayIdx, shiftDefId, wk) => {
    const key = getCellKey(wk, dayIdx, shiftDefId);
    const existing = cellNotes[key];
    setNoteText(existing?.text || '');
    setNoteColor(existing?.color || '');
    setCellNoteEditor({ dayIdx, shiftDefId, wk, key });
  };

  const handleCellNoteSave = () => {
    if (!cellNoteEditor) return;
    if (noteText.trim() || noteColor) {
      dispatch({ type: 'SET_CELL_NOTE', payload: { cellKey: cellNoteEditor.key, text: noteText.trim(), color: noteColor } });
    } else {
      dispatch({ type: 'REMOVE_CELL_NOTE', payload: cellNoteEditor.key });
    }
    setCellNoteEditor(null);
    toast('הערה נשמרה', 'success');
  };

  // Drag & Drop
  const handleDragStart = (e, assignment) => {
    if (isLocked) return;
    setDragData(assignment);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; e.currentTarget.classList.add('drag-over'); };
  const handleDragLeave = (e) => { e.currentTarget.classList.remove('drag-over'); };
  const handleDrop = (e, dayIdx, shiftDefId, wk) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    if (!dragData || isLocked) return;
    const emp = employees.find(ee => ee.id === dragData.empId);
    if (emp && !emp.eligibleShifts.includes(shiftDefId)) {
      toast(`${emp.name} לא יכול/ה לעבוד במשמרת זו`, 'warning');
      return;
    }
    if (assignments.some(a => a.empId === dragData.empId && a.dayIdx === dayIdx && a.shiftDefId === shiftDefId && a.weekKey === wk)) {
      toast('העובד כבר משובץ כאן', 'warning');
      return;
    }
    // If target cell already occupied by another worker, swap (remove existing)
    const existingInTarget = assignments.find(a => a.dayIdx === dayIdx && a.shiftDefId === shiftDefId && a.weekKey === wk && a.id !== dragData.id);
    if (existingInTarget) {
      dispatch({ type: 'REMOVE_ASSIGNMENT', payload: existingInTarget.id });
      toast('עובד הוחלף בגרירה!', 'success');
    }
    dispatch({ type: 'MOVE_ASSIGNMENT', payload: { assignmentId: dragData.id, toDayIdx: dayIdx, toShiftDefId: shiftDefId } });
    setDragData(null);
  };

  const hasConflict = (empId, dayIdx, shiftDefId, wk) => {
    return assignments.some(a => a.empId === empId && a.dayIdx === dayIdx && a.shiftDefId !== shiftDefId && a.weekKey === wk);
  };

  const mainShifts = shiftDefs.filter(d => d.section === 'main');
  const internetShifts = shiftDefs.filter(d => d.section === 'internet');

  const NOTE_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#06b6d4'];

  // ===== RENDER SHIFT ROW =====
  const renderShiftRow = (def, days, wk) => (
    <div key={`${def.id}_${wk}`} className="grid-shift-row" style={{ gridTemplateColumns: `140px repeat(${days.length}, minmax(120px, 1fr))` }}>
      {/* Shift label cell */}
      <div className="grid-cell shift-def-cell">
        <div className="def-color-dot" style={{ background: def.color || '#3b82f6' }}></div>
        <div>
          <span className="def-name">{def.name}</span>
          <span className="def-hours">{def.hours}</span>
        </div>
      </div>

      {/* Day cells — compact inline layout */}
      {days.map(day => {
        const info = getShiftForDay(def, day.idx);
        const isActive = !!info;

        if (!isActive) {
          return (
            <div key={`${day.idx}_${wk}`} className="grid-cell assignment-cell inactive-cell">
              <span className="inactive-label">—</span>
            </div>
          );
        }

        const cellAssign = getAssignmentsForCell(day.idx, def.id, wk);
        const isDropOpen = activeDropdown?.dayIdx === day.idx && activeDropdown?.shiftDefId === def.id && activeDropdown?.wk === wk;
        const ck = getCellKey(wk, day.idx, def.id);
        const note = cellNotes[ck];
        const hasOverride = info.name !== def.name || info.hours !== def.hours;

        return (
          <div
            key={`${day.idx}_${wk}`}
            className="grid-cell assignment-cell"
            style={note?.color ? { backgroundColor: note.color + '18' } : {}}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, day.idx, def.id, wk)}
          >
            {/* Override label */}
            {hasOverride && (
              <span className="cell-override-tag" style={{ color: def.color }}>
                {info.name !== def.name ? info.name : ''} {info.hours}
              </span>
            )}

            {/* Inline chips + add button — all in one row */}
            <div className="cell-inline-row">
              {cellAssign.map(assignment => {
                const emp = employees.find(e => e.id === assignment.empId);
                if (!emp) return null;
                const conflict = hasConflict(emp.id, day.idx, def.id, wk);
                const isReplaceOpen = replaceDropdown?.assignmentId === assignment.id;
                return (
                  <div key={assignment.id} className="chip-wrapper">
                    <div
                      className={`assigned-chip ${conflict ? 'conflict-chip' : ''} ${isAdmin && !isLocked ? 'clickable-chip' : ''}`}
                      draggable={isAdmin && !isLocked}
                      onDragStart={(e) => handleDragStart(e, assignment)}
                      onClick={() => isAdmin && !isLocked ? openReplaceDropdown(assignment) : null}
                      title={`${emp.name} • לחץ להחלפה`}
                    >
                      <div className="chip-color-bar" style={{ background: ROLE_COLORS[emp.roles?.[0]] || '#3b82f6' }}></div>
                      <span className="chip-name">{emp.name}</span>
                      {isAdmin && !isLocked && (
                        <button className="chip-remove" onClick={(e) => { e.stopPropagation(); removeShift(assignment.id); }}>
                          <X size={10} />
                        </button>
                      )}
                    </div>

                    {/* Replace dropdown */}
                    {isReplaceOpen && isAdmin && (
                      <div className="replace-dropdown-container glass-panel">
                        <div className="dropdown-header-label"><RefreshCw size={12} /> החלף עובד</div>
                        <div className="dropdown-search">
                          <Search size={12} />
                          <input type="text" placeholder="חיפוש..." value={replaceSearch} onChange={e => setReplaceSearch(e.target.value)} autoFocus onClick={e => e.stopPropagation()} />
                        </div>
                        <div className="dropdown-list">
                          {employees
                            .filter(e => e.active && e.id !== assignment.empId && e.name.includes(replaceSearch) && e.eligibleShifts.includes(def.id))
                            .map(emp2 => {
                              const cnt2 = getWorkerShiftCount(emp2.id);
                              const needs2 = emp2.quota - cnt2;
                              const alreadyHere = cellAssign.some(a => a.empId === emp2.id);
                              return (
                                <div key={emp2.id} className={`dropdown-item ${alreadyHere ? 'already-assigned' : ''}`}
                                  onClick={(e) => { e.stopPropagation(); if (!alreadyHere) handleReplaceWorker(assignment.id, emp2.id, day.idx, def.id, wk); }}>
                                  <span className="i-name">{emp2.name}</span>
                                  <span className={`item-needs ${needs2 <= 0 ? 'fulfilled' : ''}`}>{alreadyHere ? 'כאן' : needs2 > 0 ? `עוד ${needs2}` : `מלא`}</span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* + button to add worker — inline with chips */}
              {isAdmin && !isLocked && cellAssign.length === 0 && (
                <button className="add-btn-inline" onClick={() => toggleDropdown(day.idx, def.id, wk)} title="שיבוץ עובד">+</button>
              )}
              {/* Add worker dropdown */}
              {isDropOpen && (
                <div className="shift-dropdown-container glass-panel">
                  <div className="dropdown-search">
                    <Search size={13} />
                    <input type="text" placeholder="חיפוש עובד..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} autoFocus />
                  </div>
                  <div className="dropdown-list">
                    {employees
                      .filter(e => e.active && e.name.includes(searchTerm) && e.eligibleShifts.includes(def.id))
                      .map(emp => {
                        const count = getWorkerShiftCount(emp.id);
                        const needs = emp.quota - count;
                        const alreadyHere = cellAssign.some(a => a.empId === emp.id);
                        const sameDay = hasConflict(emp.id, day.idx, def.id, wk);
                        const isFull = needs <= 0;
                        const pct = Math.min((count / emp.quota) * 100, 100);
                        return { emp, count, needs, alreadyHere, sameDay, isFull, pct };
                      })
                      .sort((a, b) => {
                        if (a.alreadyHere !== b.alreadyHere) return a.alreadyHere ? 1 : -1;
                        if (a.isFull !== b.isFull) return a.isFull ? 1 : -1;
                        return b.needs - a.needs;
                      })
                      .map(({ emp, count, needs, alreadyHere, sameDay, isFull, pct }) => (
                        <div key={emp.id}
                          className={`dropdown-item ${isFull && !alreadyHere ? 'ineligible' : ''} ${alreadyHere ? 'already-assigned' : ''} ${sameDay ? 'same-day-conflict' : ''}`}
                          onClick={() => !isFull && !alreadyHere && !sameDay ? assignWorker(emp.id, day.idx, def.id, wk) : null}>
                          <div className="di-left">
                            <span className="i-name">{emp.name}</span>
                            <div className="di-avail-bar">
                              <div
                                className={`di-avail-fill ${isFull ? 'di-full' : needs === 1 ? 'di-near' : ''}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          <span className={`item-needs ${isFull ? 'fulfilled' : needs === 1 ? 'needs-one' : ''}`}>
                            {alreadyHere ? '✓' : sameDay ? '⚠' : isFull ? 'מלא' : needs === 1 ? '1 נשאר' : `${needs}/${emp.quota}`}
                          </span>
                        </div>
                      ))}
                    {employees.filter(e => e.active && e.name.includes(searchTerm) && e.eligibleShifts.includes(def.id)).length === 0 && (
                      <div className="dropdown-empty">אין עובדים זמינים</div>
                    )}
                  </div>
                </div>
              )}
              {/* Note text */}
              {note?.text && <span className="cell-note-tag" style={note.color ? { color: note.color } : {}}>{note.text}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="schedule-planner">
      {/* Management Summary */}
      {renderManagementSummary()}

      {/* Top Action Bar */}
      <div className="planner-header no-print">
        <div className="week-navigation glass-panel">
          <button className="icon-btn" onClick={() => dispatch({ type: 'SET_WEEK_OFFSET', payload: weekOffset + 1 })}>
            <ChevronRight size={20} />
          </button>
          <div className="current-week">
            {isLocked && <Lock size={14} className="lock-inline" />}
            <span className="week-label">{weekLabel}</span>
          </div>
          <button className="icon-btn" onClick={() => dispatch({ type: 'SET_WEEK_OFFSET', payload: weekOffset - 1 })}>
            <ChevronLeft size={20} />
          </button>
        </div>

        <div className="planner-actions">
          {isAdmin && (
            <>
              <button className={`btn-lock ${isLocked ? 'locked' : ''}`} onClick={() => { dispatch({ type: 'TOGGLE_LOCK' }); toast(isLocked ? 'הסידור נפתח' : 'הסידור ננעל!', isLocked ? 'success' : 'warning'); }}>
                {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                <span>{isLocked ? 'נעול 🔒' : 'נעילה'}</span>
              </button>
              <button className="btn-secondary" onClick={() => setShowShiftDefsEditor(true)}>
                <Edit3 size={16} /> <span>הגדרת משמרות</span>
              </button>
              <button className="btn-secondary" onClick={() => setShowAddWorker(true)}>
                <UserPlus size={16} /> <span>הוסף עובד</span>
              </button>
              <button className="btn-secondary" onClick={() => dispatch({ type: 'TOGGLE_MULTI_WEEK' })}>
                <Layers size={16} /> <span>{multiWeek ? 'שבוע 1' : '2 שבועות'}</span>
              </button>
              <button className={`btn-secondary ${showShiftRequestsPanel ? 'active-toggle' : ''}`} onClick={() => setShowShiftRequestsPanel(!showShiftRequestsPanel)}>
                <ClipboardList size={16} /> <span>בקשות</span>
                {shiftRequests.filter(r => r.weekKey === weekKey).length > 0 && <span className="req-count-badge">{shiftRequests.filter(r => r.weekKey === weekKey).length}</span>}
              </button>
            </>
          )}
          <button className="btn-secondary" onClick={handlePrint}>
            <Printer size={16} /> <span>הדפס A4</span>
          </button>
          <button className="btn-secondary" onClick={handleCSVExport}>
            <Download size={16} /> <span>CSV</span>
          </button>
          {isAdmin && (
            <>
              <button className="btn-secondary" onClick={handleSaveSchedule}>
                <Send size={16} /> <span>שמור</span>
              </button>
              <button
                className={`btn-primary ai-generate-btn ${isGenerating ? 'generating' : ''}`}
                onClick={handleAutoSchedule}
                disabled={isGenerating || isLocked}
              >
                <Sparkles size={16} className="ai-icon" />
                <span>{isGenerating ? 'מחשב...' : 'שיבוץ AI'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Quota Bar — wraps in 2-3 lines */}
      <div className="quota-bar-container glass-panel no-print">
        {employees.filter(e => e.active).map(emp => {
          const count = getWorkerShiftCount(emp.id);
          const isFull = count >= emp.quota;
          const isOver = count > emp.quota;
          return (
            <div
              key={emp.id}
              className={`quota-card ${isOver ? 'over-quota' : ''} ${selectedQuotaEmp === emp.id ? 'quota-selected' : ''}`}
              onClick={() => setSelectedQuotaEmp(selectedQuotaEmp === emp.id ? null : emp.id)}
            >
              <div className="quota-avatar" style={{ borderColor: ROLE_COLORS[emp.roles?.[0]] || '#3b82f6' }}>{emp.avatar}</div>
              <div className="quota-details">
                <span className="q-name">{emp.name}</span>
                <span className="q-role">{emp.roles.join(', ')}</span>
              </div>
              <div className={`quota-progress ${isFull ? 'full' : ''} ${isOver ? 'over' : ''}`}>{count}/{emp.quota}</div>
              {(() => {
                const empNotes = workerNotes.filter(n => n.empId === emp.id);
                const empReq = shiftRequests.find(r => r.empId === emp.id && r.weekKey === weekKey);
                const hasComment = empNotes.length > 0 || (empReq && empReq.comment);
                if (!hasComment) return null;
                const preview = empNotes.length > 0 ? empNotes[0].text : empReq?.comment || '';
                return <div className="quota-comment-badge" title={preview}>💬</div>;
              })()}
            </div>
          );
        })}
      </div>

      {/* Quota Detail Panel */}
      {selectedQuotaEmp && (() => {
        const emp = employees.find(e => e.id === selectedQuotaEmp);
        if (!emp) return null;
        const empShifts = assignments.filter(a => a.empId === emp.id && a.weekKey === weekKey);
        const count = empShifts.length;
        const remaining = emp.quota - count;
        const dayMap = {};
        const conflicts = [];
        empShifts.forEach(s => { if (dayMap[s.dayIdx]) conflicts.push(s); dayMap[s.dayIdx] = true; });
        return (
          <div className="quota-detail-panel glass-panel no-print">
            <div className="qd-header">
              <div className="qd-avatar" style={{ borderColor: ROLE_COLORS[emp.roles?.[0]] || '#3b82f6' }}>{emp.avatar}</div>
              <div><h4>{emp.name}</h4><span className="qd-roles">{emp.roles.join(', ')} • {emp.phone || 'אין טלפון'}</span></div>
              <button className="modal-close-btn" onClick={() => setSelectedQuotaEmp(null)}>✕</button>
            </div>
            <div className="qd-stats">
              <div className="qd-stat"><span className="qd-stat-num">{count}</span><span>משובצים</span></div>
              <div className="qd-stat"><span className={`qd-stat-num ${remaining <= 0 ? 'stat-full' : ''}`}>{remaining > 0 ? remaining : 0}</span><span>נותרו</span></div>
              <div className="qd-stat"><span className={`qd-stat-num ${conflicts.length > 0 ? 'stat-conflict' : ''}`}>{conflicts.length}</span><span>קונפליקטים</span></div>
            </div>
            <div className="qd-shifts-list">
              <h5>משמרות השבוע:</h5>
              {empShifts.length === 0 && <p className="qd-empty">לא משובץ/ת</p>}
              {empShifts.map(s => {
                const def = shiftDefs.find(d => d.id === s.shiftDefId);
                const day = weekDays.find(d => d.idx === s.dayIdx);
                const info = def ? getShiftForDay(def, s.dayIdx) : null;
                return (
                  <div key={s.id} className="qd-shift-item">
                    <span className="qd-shift-dot" style={{ background: def?.color || '#3b82f6' }}></span>
                    <span>{day?.name} {day?.date}</span>
                    <span className="qd-shift-name">{info?.name || def?.name} ({info?.hours || def?.hours})</span>
                  </div>
                );
              })}
            </div>
            <div className="qd-eligible">
              <h5>משמרות מורשות:</h5>
              <div className="qd-eligible-tags">
                {emp.eligibleShifts.map(sid => {
                  const def = shiftDefs.find(d => d.id === sid);
                  return def ? <span key={sid} className="qd-tag" style={{ borderColor: def.color }}>{def.name}</span> : null;
                })}
              </div>
            </div>
            {/* Worker Notes & Shift Request Comments */}
            {(() => {
              const notes = workerNotes.filter(n => n.empId === emp.id);
              const req = shiftRequests.find(r => r.empId === emp.id && r.weekKey === weekKey);
              if (notes.length === 0 && !req) return null;
              return (
                <div className="qd-notes-section">
                  <h5>💬 הערות ובקשות:</h5>
                  {req?.comment && (
                    <div className="qd-note-item qd-request-comment">
                      <span className="qd-note-label">הערה:</span>
                      <span className="qd-note-text">{req.comment}</span>
                    </div>
                  )}
                  {req?.blockedDay !== null && req?.blockedDay !== undefined && (
                    <div className="qd-note-item qd-blocked-day">
                      <span className="qd-note-label">🚫 יום חסום:</span>
                      <span className="qd-note-text">{['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'][req.blockedDay]}</span>
                    </div>
                  )}
                  {req?.preferNotSlots?.length > 0 && (
                    <div className="qd-note-item qd-prefer-not">
                      <span className="qd-note-label">⚠ מעדיף/ה לא:</span>
                      <span className="qd-note-text">
                        {req.preferNotSlots.map((sl) => {
                          const sDef = shiftDefs.find(dd => dd.id === sl.shiftDefId);
                          return `${['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'][sl.dayIdx]} ${sDef?.name || ''}`;
                        }).join(' | ')}
                      </span>
                    </div>
                  )}
                  {notes.map(n => (
                    <div key={n.id} className="qd-note-item">
                      <span className="qd-note-text">{n.text}</span>
                      <span className="qd-note-time">{new Date(n.timestamp).toLocaleDateString('he-IL')}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* ===== SHIFT REQUESTS PANEL (Admin Only) ===== */}
      {isAdmin && showShiftRequestsPanel && (() => {
        const weekReqs = shiftRequests.filter(r => r.weekKey === weekKey);
        const dayNames = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
        const dayLetters = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
        if (weekReqs.length === 0) return (
          <div className="shift-requests-panel glass-panel no-print">
            <h3 className="srp-title">📋 בקשות עובדים לשבוע</h3>
            <p className="srp-empty">אין בקשות לשבוע זה</p>
          </div>
        );
        return (
          <div className="shift-requests-panel glass-panel no-print">
            <h3 className="srp-title">📋 בקשות עובדים לשבוע <span className="srp-count">{weekReqs.length}</span></h3>
            <div className="srp-table-wrap">
              <table className="srp-table">
                <thead>
                  <tr>
                    <th>עובד</th>
                    <th>יום חסום</th>
                    <th>מעדיף/ה לא</th>
                    <th>הערה</th>
                  </tr>
                </thead>
                <tbody>
                  {weekReqs.map(req => {
                    const reqEmp = employees.find(e => e.id === req.empId);
                    return (
                      <tr key={req.id}>
                        <td className="srp-emp-name">
                          <div className="srp-avatar" style={{ borderColor: ROLE_COLORS[reqEmp?.roles?.[0]] || '#3b82f6' }}>{reqEmp?.avatar}</div>
                          {reqEmp?.name || '?'}
                        </td>
                        <td className="srp-blocked">
                          {req.blockedDay !== null && req.blockedDay !== undefined
                            ? <span className="srp-block-tag">🚫 {dayNames[req.blockedDay]}</span>
                            : '—'}
                        </td>
                        <td className="srp-prefer-not">
                          {req.preferNotSlots?.length > 0
                            ? req.preferNotSlots.map((sl, i) => {
                                const pDef = shiftDefs.find(dd => dd.id === sl.shiftDefId);
                                return <span key={i} className="srp-pref-tag">{dayLetters[sl.dayIdx]} {pDef?.name || ''}</span>;
                              })
                            : '—'}
                        </td>
                        <td className="srp-comment">{req.comment || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ===== MAIN GRID ===== */}
      <div className="schedule-grid-container glass-panel" ref={gridRef} id="print-grid">
        {isGenerating && (
          <div className="scanning-overlay">
            <div className="scanner-line"></div>
            <p className="scanner-text">ה-AI משבץ משמרות...</p>
          </div>
        )}

        {/* Print Title — only shows in print */}
        <div className="print-title">
          <div>
            <h2>סידור עבודה — {weekLabel}</h2>
            <div className="print-subtitle">הופק ב-{new Date().toLocaleDateString('he-IL')}</div>
          </div>
          <div className="print-logo">⧖ ShiftSync Pro</div>
        </div>

        {/* Header Row */}
        <div className="grid-shift-header-row" style={{ gridTemplateColumns: `140px repeat(${weekDays.length}, minmax(120px, 1fr))` }}>
          <div className="grid-cell time-col-header">משמרות</div>
          {weekDays.map(day => (
            <div key={day.idx} className="grid-cell day-header-cell">
              <span className="day-name">{day.name}</span>
              <span className="day-date">{day.date}</span>
            </div>
          ))}
        </div>

        {/* Grid Body */}
        <div className="grid-shift-body">
          {mainShifts.length > 0 && <div className="section-label"><span>משמרות ראשיות</span></div>}
          {mainShifts.map(def => renderShiftRow(def, weekDays, weekKey))}

          {internetShifts.length > 0 && <div className="section-label internet-section"><span>אינטרנט</span></div>}
          {internetShifts.map(def => renderShiftRow(def, weekDays, weekKey))}

          {multiWeek && (
            <>
              <div className="section-label week2-section"><span>שבוע הבא — {getWeekLabel(weekOffset + 1)}</span></div>
              {mainShifts.map(def => renderShiftRow(def, weekDays2, weekKey2))}
              {internetShifts.map(def => renderShiftRow(def, weekDays2, weekKey2))}
            </>
          )}
        </div>
      </div>

      {/* ===== MODALS ===== */}

      {cellNoteEditor && (
        <Modal title="הערה וצבע לתא" onClose={() => setCellNoteEditor(null)} width="380px">
          <div className="modal-form">
            <label>הערה:</label>
            <input type="text" value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="למשל: חוסר, חופש..." maxLength={30} />
            <label>צבע רקע:</label>
            <div className="note-color-picker">
              <button className={`color-swatch no-color ${!noteColor ? 'active-swatch' : ''}`} onClick={() => setNoteColor('')}>✕</button>
              {NOTE_COLORS.map(c => (
                <button key={c} className={`color-swatch ${noteColor === c ? 'active-swatch' : ''}`} style={{ background: c }} onClick={() => setNoteColor(c)} />
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setCellNoteEditor(null)}>ביטול</button>
              <button className="btn-primary" onClick={handleCellNoteSave}>שמור</button>
            </div>
          </div>
        </Modal>
      )}

      {showShiftDefsEditor && (
        <Modal title="הגדרת משמרות" onClose={() => setShowShiftDefsEditor(false)} width="620px">
          <p className="modal-text">ערוך שמות, שעות, ימים פעילים ומקטע.</p>
          <div className="def-editor-list">
            {shiftDefs.map(def => (
              <div key={def.id} className="def-editor-row">
                <input className="def-color-input" type="color" value={def.color || '#3b82f6'} onChange={e => dispatch({ type: 'UPDATE_SHIFT_DEF', payload: { id: def.id, color: e.target.value } })} />
                <input type="text" value={def.name} onChange={e => dispatch({ type: 'UPDATE_SHIFT_DEF', payload: { id: def.id, name: e.target.value } })} placeholder="שם" />
                <input type="text" value={def.hours} onChange={e => dispatch({ type: 'UPDATE_SHIFT_DEF', payload: { id: def.id, hours: e.target.value } })} placeholder="שעות" />
                <select value={def.section} onChange={e => dispatch({ type: 'UPDATE_SHIFT_DEF', payload: { id: def.id, section: e.target.value } })}>
                  <option value="main">ראשי</option>
                  <option value="internet">אינטרנט</option>
                </select>
                <button className="icon-btn-danger" onClick={() => dispatch({ type: 'DELETE_SHIFT_DEF', payload: def.id })}>
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          <button className="btn-secondary" onClick={() => dispatch({ type: 'ADD_SHIFT_DEF', payload: { id: `t${Date.now()}`, name: 'חדש', hours: '00:00 - 00:00', section: 'main', color: '#3b82f6', activeDays: [0,1,2,3,4,5,6], dayOverrides: {} } })} style={{ marginTop: '12px', width: '100%', justifyContent: 'center' }}>
            + הוסף משמרת
          </button>
          <div className="modal-actions">
            <button className="btn-primary" onClick={() => setShowShiftDefsEditor(false)}>סיום</button>
          </div>
        </Modal>
      )}

      {showAddWorker && (
        <Modal title="הוספת עובד חדש" onClose={() => setShowAddWorker(false)} width="480px">
          <form onSubmit={handleAddWorkerSubmit} className="modal-form">
            <label>שם מלא:</label>
            <input type="text" value={newWorker.name} onChange={e => setNewWorker({ ...newWorker, name: e.target.value })} required />
            <label>אימייל:</label>
            <input type="email" value={newWorker.email} onChange={e => setNewWorker({ ...newWorker, email: e.target.value })} />
            <label>טלפון:</label>
            <input type="tel" value={newWorker.phone} onChange={e => setNewWorker({ ...newWorker, phone: e.target.value })} />
            <label>מכסה שבועית:</label>
            <input type="number" value={newWorker.quota} onChange={e => setNewWorker({ ...newWorker, quota: e.target.value })} min="1" max="21" />
            <label>משמרות מורשות:</label>
            <div className="eligible-checkboxes">
              {shiftDefs.map(d => (
                <label key={d.id} className="eligible-check-item">
                  <input
                    type="checkbox"
                    checked={newWorker.eligibleShifts.includes(d.id)}
                    onChange={e => {
                      if (e.target.checked) setNewWorker({ ...newWorker, eligibleShifts: [...newWorker.eligibleShifts, d.id] });
                      else setNewWorker({ ...newWorker, eligibleShifts: newWorker.eligibleShifts.filter(x => x !== d.id) });
                    }}
                  />
                  <span style={{ color: d.color }}>{d.name}</span>
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowAddWorker(false)}>ביטול</button>
              <button type="submit" className="btn-primary">שמור עובד</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
