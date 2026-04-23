import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from './ui/Toast';
import { Archive, Eye, Trash2, Download, Calendar } from 'lucide-react';
import './ScheduleArchive.css';

export default function ScheduleArchive() {
  const { state, dispatch } = useApp();
  const toast = useToast();
  const { savedSchedules, shiftDefs, employees } = state;

  const [viewingSchedule, setViewingSchedule] = useState(null);

  const handleDelete = (id) => {
    if (confirm('בטוח למחוק סידור זה מהארכיון?')) {
      dispatch({ type: 'DELETE_SAVED_SCHEDULE', payload: id });
      toast('הסידור נמחק מהארכיון', 'warning');
    }
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const WEEK_DAYS_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  return (
    <div className="schedule-archive">
      <h2>📁 ארכיון סידורי עבודה</h2>
      <p className="archive-subtitle">סידורים שנשמרו ניתנים לצפייה מחדש</p>

      {savedSchedules.length === 0 && (
        <div className="archive-empty glass-panel">
          <Archive size={48} className="archive-empty-icon" />
          <h3>הארכיון ריק</h3>
          <p>שמור סידור מעמוד לוח הסידור כדי לראות אותו כאן</p>
        </div>
      )}

      <div className="archive-list">
        {savedSchedules.map(sched => (
          <div key={sched.id} className="archive-card glass-panel">
            <div className="archive-card-info">
              <Calendar size={20} className="archive-cal-icon" />
              <div>
                <h4>{sched.weekLabel}</h4>
                <span className="archive-date">נשמר: {formatDate(sched.savedAt)}</span>
                <span className="archive-count">{sched.assignments.length} שיבוצים</span>
              </div>
            </div>
            <div className="archive-card-actions">
              <button className="btn-secondary" onClick={() => setViewingSchedule(sched)}>
                <Eye size={15} /> צפייה
              </button>
              <button className="tbl-btn delete-btn" onClick={() => handleDelete(sched.id)} title="מחק">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Viewing Modal */}
      {viewingSchedule && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewingSchedule(null); }}>
          <div className="modal-content glass-panel" style={{ width: '90vw', maxWidth: '1100px', maxHeight: '85vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h3>📋 {viewingSchedule.weekLabel}</h3>
              <button className="modal-close-btn" onClick={() => setViewingSchedule(null)}>✕</button>
            </div>
            <div className="archive-view-grid">
              <table className="archive-table">
                <thead>
                  <tr>
                    <th>משמרת</th>
                    {WEEK_DAYS_NAMES.map(d => <th key={d}>{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {shiftDefs.map(def => (
                    <tr key={def.id}>
                      <td className="archive-shift-label">
                        <span className="archive-shift-dot" style={{ background: def.color }}></span>
                        <div>
                          <span className="archive-def-name">{def.name}</span>
                          <span className="archive-def-hours">{def.hours}</span>
                        </div>
                      </td>
                      {WEEK_DAYS_NAMES.map((_, dayIdx) => {
                        const cellAssign = viewingSchedule.assignments.filter(a => a.dayIdx === dayIdx && a.shiftDefId === def.id);
                        return (
                          <td key={dayIdx} className="archive-cell">
                            {cellAssign.map(a => {
                              const emp = employees.find(e => e.id === a.empId);
                              return emp ? <span key={a.id} className="archive-chip">{emp.name}</span> : null;
                            })}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
