import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { INITIAL_EMPLOYEES, INITIAL_SHIFT_DEFS } from '../data/initialData';

const AppContext = createContext(null);

const STORAGE_KEY = 'shiftsync_pro_state';

// Load from localStorage
function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) { /* ignore */ }
  return null;
}

const defaultState = {
  currentUser: null, // { id, name, role: 'admin'|'worker' }
  employees: INITIAL_EMPLOYEES,
  shiftDefs: INITIAL_SHIFT_DEFS,
  assignments: [], // { id, empId, dayIdx, shiftDefId, weekKey }
  weekOffset: 1, // Default: next week
  isLocked: false,
  swapRequests: [], // { id, empId, fromShiftDefId, fromDayIdx, toShiftDefId, toDayIdx, reason, status, weekKey }
  chatMessages: [], // { id, userId, userName, text, timestamp, isAdmin }
  savedSchedules: [], // { id, weekLabel, weekKey, assignments, savedAt }
  notifications: [], // { id, text, type, timestamp, read }
  cellNotes: {}, // { `${weekKey}_${dayIdx}_${shiftDefId}`: { text, color } }
  workerNotes: [], // { id, empId, empName, text, timestamp, read }
  shiftRequests: [], // { id, empId, weekKey, blockedDay: number|null, preferNotSlots: [{dayIdx, shiftDefId}], comment: string, timestamp }
  theme: 'dark',
  fontSize: 'normal',
  multiWeek: false,
  // Undo/redo
  history: [],
  historyIndex: -1,
};

function getWeekKey(offset) {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + offset * 7);
  return d.toISOString().split('T')[0];
}

function pushHistory(state) {
  const snap = { assignments: [...state.assignments], cellNotes: { ...state.cellNotes } };
  const history = state.history.slice(0, state.historyIndex + 1);
  history.push(snap);
  if (history.length > 50) history.shift();
  return { history, historyIndex: history.length - 1 };
}

function reducer(state, action) {
  switch (action.type) {

    case 'LOGIN':
      return { ...state, currentUser: action.payload };

    case 'LOGOUT':
      return { ...state, currentUser: null };

    case 'SET_THEME':
      return { ...state, theme: action.payload };

    case 'SET_FONT_SIZE':
      return { ...state, fontSize: action.payload };

    case 'TOGGLE_MULTI_WEEK':
      return { ...state, multiWeek: !state.multiWeek };

    case 'SET_WEEK_OFFSET':
      return { ...state, weekOffset: action.payload };

    case 'TOGGLE_LOCK':
      return { ...state, isLocked: !state.isLocked };

    // Employee CRUD
    case 'ADD_EMPLOYEE':
      return { ...state, employees: [...state.employees, action.payload] };

    case 'UPDATE_EMPLOYEE':
      return { ...state, employees: state.employees.map(e => e.id === action.payload.id ? { ...e, ...action.payload } : e) };

    case 'DELETE_EMPLOYEE':
      return {
        ...state,
        employees: state.employees.filter(e => e.id !== action.payload),
        assignments: state.assignments.filter(a => a.empId !== action.payload)
      };

    // Shift Definitions
    case 'SET_SHIFT_DEFS':
      return { ...state, shiftDefs: action.payload };

    case 'ADD_SHIFT_DEF':
      return { ...state, shiftDefs: [...state.shiftDefs, action.payload] };

    case 'UPDATE_SHIFT_DEF':
      return { ...state, shiftDefs: state.shiftDefs.map(d => d.id === action.payload.id ? { ...d, ...action.payload } : d) };

    case 'DELETE_SHIFT_DEF':
      return { ...state, shiftDefs: state.shiftDefs.filter(d => d.id !== action.payload) };

    // Assignments
    case 'ASSIGN_WORKER': {
      const hist = pushHistory(state);
      return { ...state, ...hist, assignments: [...state.assignments, action.payload] };
    }

    case 'REMOVE_ASSIGNMENT': {
      const hist = pushHistory(state);
      return { ...state, ...hist, assignments: state.assignments.filter(a => a.id !== action.payload) };
    }

    case 'SET_ASSIGNMENTS': {
      const hist = pushHistory(state);
      return { ...state, ...hist, assignments: action.payload };
    }

    case 'MOVE_ASSIGNMENT': {
      const { assignmentId, toDayIdx, toShiftDefId } = action.payload;
      const hist = pushHistory(state);
      return {
        ...state, ...hist,
        assignments: state.assignments.map(a =>
          a.id === assignmentId ? { ...a, dayIdx: toDayIdx, shiftDefId: toShiftDefId } : a
        )
      };
    }

    // Cell Notes
    case 'SET_CELL_NOTE': {
      const { cellKey, text, color } = action.payload;
      return { ...state, cellNotes: { ...state.cellNotes, [cellKey]: { text, color } } };
    }

    case 'REMOVE_CELL_NOTE': {
      const notes = { ...state.cellNotes };
      delete notes[action.payload];
      return { ...state, cellNotes: notes };
    }

    // Swap Requests
    case 'ADD_SWAP_REQUEST':
      return { ...state, swapRequests: [...state.swapRequests, action.payload] };

    case 'UPDATE_SWAP_REQUEST':
      return { ...state, swapRequests: state.swapRequests.map(r => r.id === action.payload.id ? { ...r, ...action.payload } : r) };

    // Chat
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatMessages: [...state.chatMessages, action.payload] };

    // Saved Schedules
    case 'SAVE_SCHEDULE':
      return { ...state, savedSchedules: [...state.savedSchedules, action.payload] };

    case 'DELETE_SAVED_SCHEDULE':
      return { ...state, savedSchedules: state.savedSchedules.filter(s => s.id !== action.payload) };

    // Notifications
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [action.payload, ...state.notifications] };

    case 'MARK_NOTIFICATION_READ':
      return { ...state, notifications: state.notifications.map(n => n.id === action.payload ? { ...n, read: true } : n) };

    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };

    // Undo/Redo
    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const prev = state.history[state.historyIndex - 1];
      return { ...state, historyIndex: state.historyIndex - 1, assignments: prev.assignments, cellNotes: prev.cellNotes };
    }
    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const next = state.history[state.historyIndex + 1];
      return { ...state, historyIndex: state.historyIndex + 1, assignments: next.assignments, cellNotes: next.cellNotes };
    }

    // Worker Notes
    case 'ADD_WORKER_NOTE':
      return { ...state, workerNotes: [action.payload, ...state.workerNotes] };

    case 'MARK_WORKER_NOTE_READ':
      return { ...state, workerNotes: state.workerNotes.map(n => n.id === action.payload ? { ...n, read: true } : n) };

    // Shift Requests (employee weekly requests with blocked day + prefer-not slots)
    case 'ADD_SHIFT_REQUEST':
      return { ...state, shiftRequests: [...state.shiftRequests, action.payload] };

    case 'UPDATE_SHIFT_REQUEST':
      return { ...state, shiftRequests: state.shiftRequests.map(r => r.id === action.payload.id ? { ...r, ...action.payload } : r) };

    case 'DELETE_SHIFT_REQUEST':
      return { ...state, shiftRequests: state.shiftRequests.filter(r => r.id !== action.payload) };

    // Toast (handled in component level, not stored)
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const saved = loadState();
  let initial = saved ? { ...defaultState, ...saved, history: [], historyIndex: -1 } : defaultState;
  // Migration: if old shiftDefs don't have activeDays, use fresh defaults
  if (initial.shiftDefs && initial.shiftDefs.length > 0 && !initial.shiftDefs[0].activeDays) {
    initial = { ...initial, shiftDefs: INITIAL_SHIFT_DEFS };
  }
  // Migration: ensure internet section only has 2 shifts (בוקר, ערב) and t9 has correct overrides
  if (initial.shiftDefs) {
    const internetShifts = initial.shiftDefs.filter(d => d.section === 'internet');
    if (internetShifts.length > 2) {
      initial.shiftDefs = [
        ...initial.shiftDefs.filter(d => d.section !== 'internet'),
        ...INITIAL_SHIFT_DEFS.filter(d => d.section === 'internet')
      ];
    } else {
      initial.shiftDefs = initial.shiftDefs.map(d => {
        if (d.id === 't9') {
          return { ...d, dayOverrides: { ...d.dayOverrides, 5: { hours: '12:00 - 22:00' }, 6: { hours: '00:00 - 15:00' } } };
        }
        return d;
      });
    }
  }
  // Migration: ensure shiftRequests exists
  if (!initial.shiftRequests) {
    initial = { ...initial, shiftRequests: [] };
  }

  const [state, dispatch] = useReducer(reducer, initial);

  // Save to localStorage on changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      const toSave = { ...state };
      delete toSave.history;
      delete toSave.historyIndex;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    }, 300);
    return () => clearTimeout(timer);
  }, [state]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
      }
      if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      }
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(el => el.click());
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const weekKey = getWeekKey(state.weekOffset);

  const getWorkerShiftCount = useCallback((empId) => {
    return state.assignments.filter(a => a.empId === empId && a.weekKey === weekKey).length;
  }, [state.assignments, weekKey]);

  const value = { state, dispatch, weekKey, getWorkerShiftCount };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}

export { getWeekKey };
