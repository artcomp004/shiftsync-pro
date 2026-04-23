import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { getWeekDays, getWeekLabel, getShiftForDay, ROLE_COLORS } from '../data/initialData';
import {
  BarChart3, Users, CalendarCheck, AlertTriangle, TrendingUp, Clock,
  CheckCircle2, XCircle, ChevronRight, ChevronLeft, Activity
} from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const { state, weekKey, getWorkerShiftCount } = useApp();
  const { employees, shiftDefs, assignments, weekOffset, shiftRequests, swapRequests, workerNotes } = state;

  const weekDays = getWeekDays(weekOffset);
  const weekLabel = getWeekLabel(weekOffset);
  const activeEmployees = employees.filter(e => e.active);

  // ===== CALCULATIONS =====
  const stats = useMemo(() => {
    const weekAssignments = assignments.filter(a => a.weekKey === weekKey);

    // Total required shift slots
    let totalSlots = 0;
    shiftDefs.forEach(def => {
      weekDays.forEach(day => {
        if (getShiftForDay(def, day.idx)) totalSlots++;
      });
    });

    // Fill rate
    const filledSlots = weekAssignments.length;
    const fillRate = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

    // Quota stats
    const totalQuota = activeEmployees.reduce((sum, e) => sum + e.quota, 0);
    const totalAssigned = weekAssignments.length;
    const quotaDiff = totalQuota - totalSlots;

    // Workers below/above quota
    const belowQuota = activeEmployees.filter(e => {
      const c = weekAssignments.filter(a => a.empId === e.id).length;
      return c < e.quota;
    });
    const atQuota = activeEmployees.filter(e => {
      const c = weekAssignments.filter(a => a.empId === e.id).length;
      return c >= e.quota;
    });
    const overQuota = activeEmployees.filter(e => {
      const c = weekAssignments.filter(a => a.empId === e.id).length;
      return c > e.quota;
    });

    // Conflicts (same person assigned to multiple shifts on same day)
    let conflicts = 0;
    activeEmployees.forEach(emp => {
      const empAssignments = weekAssignments.filter(a => a.empId === emp.id);
      const dayMap = {};
      empAssignments.forEach(a => {
        if (dayMap[a.dayIdx]) conflicts++;
        dayMap[a.dayIdx] = true;
      });
    });

    // Unassigned shifts (cells with no worker)
    let unassigned = 0;
    shiftDefs.forEach(def => {
      weekDays.forEach(day => {
        if (getShiftForDay(def, day.idx)) {
          const cellAssign = weekAssignments.filter(a => a.dayIdx === day.idx && a.shiftDefId === def.id);
          if (cellAssign.length === 0) unassigned++;
        }
      });
    });

    // Pending requests
    const pendingSwaps = swapRequests.filter(r => r.status === 'pending').length;
    const weekRequests = shiftRequests.filter(r => r.weekKey === weekKey).length;
    const unreadNotes = workerNotes.filter(n => !n.read).length;

    // Coverage heatmap data (per day)
    const dailyCoverage = weekDays.map(day => {
      let daySlots = 0;
      let dayFilled = 0;
      shiftDefs.forEach(def => {
        if (getShiftForDay(def, day.idx)) {
          daySlots++;
          const has = weekAssignments.some(a => a.dayIdx === day.idx && a.shiftDefId === def.id);
          if (has) dayFilled++;
        }
      });
      return { day, slots: daySlots, filled: dayFilled, rate: daySlots > 0 ? Math.round((dayFilled / daySlots) * 100) : 0 };
    });

    // Worker utilization data
    const workerUtil = activeEmployees.map(emp => {
      const count = weekAssignments.filter(a => a.empId === emp.id).length;
      return { emp, count, pct: Math.min(Math.round((count / emp.quota) * 100), 150) };
    }).sort((a, b) => b.pct - a.pct);

    return {
      totalSlots, filledSlots, fillRate, totalQuota, totalAssigned, quotaDiff,
      belowQuota, atQuota, overQuota, conflicts, unassigned,
      pendingSwaps, weekRequests, unreadNotes,
      dailyCoverage, workerUtil
    };
  }, [assignments, weekKey, employees, shiftDefs, weekDays, shiftRequests, swapRequests, workerNotes]);

  const getCoverageColor = (rate) => {
    if (rate >= 100) return 'var(--success)';
    if (rate >= 70) return 'var(--warning)';
    if (rate >= 40) return '#f97316';
    return 'var(--error)';
  };

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div>
          <h2>📊 לוח בקרה</h2>
          <p className="dash-subtitle">{weekLabel}</p>
        </div>
      </div>

      {/* ===== KPI CARDS ===== */}
      <div className="dash-kpi-grid">
        <div className="kpi-card kpi-fill">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.12)' }}>
            <BarChart3 size={22} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{stats.fillRate}%</span>
            <span className="kpi-label">אחוז איוש</span>
          </div>
          <div className="kpi-ring" style={{ '--pct': stats.fillRate, '--ring-color': stats.fillRate >= 80 ? 'var(--success)' : stats.fillRate >= 50 ? 'var(--warning)' : 'var(--error)' }}>
            <svg viewBox="0 0 36 36">
              <path className="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="ring-fill" strokeDasharray={`${stats.fillRate}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)' }}>
            <CalendarCheck size={22} style={{ color: 'var(--success)' }} />
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{stats.filledSlots}<span className="kpi-of">/{stats.totalSlots}</span></span>
            <span className="kpi-label">משמרות מאוישות</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.12)' }}>
            <Users size={22} style={{ color: 'var(--accent-secondary)' }} />
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{activeEmployees.length}</span>
            <span className="kpi-label">עובדים פעילים</span>
          </div>
        </div>

        <div className={`kpi-card ${stats.unassigned > 0 ? 'kpi-warn' : ''}`}>
          <div className="kpi-icon-wrap" style={{ background: stats.unassigned > 0 ? 'var(--error-bg)' : 'var(--success-bg)' }}>
            {stats.unassigned > 0
              ? <XCircle size={22} style={{ color: 'var(--error)' }} />
              : <CheckCircle2 size={22} style={{ color: 'var(--success)' }} />}
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{stats.unassigned}</span>
            <span className="kpi-label">משמרות ריקות</span>
          </div>
        </div>

        <div className={`kpi-card ${stats.conflicts > 0 ? 'kpi-warn' : ''}`}>
          <div className="kpi-icon-wrap" style={{ background: stats.conflicts > 0 ? 'var(--warning-bg)' : 'var(--success-bg)' }}>
            <AlertTriangle size={22} style={{ color: stats.conflicts > 0 ? 'var(--warning)' : 'var(--success)' }} />
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{stats.conflicts}</span>
            <span className="kpi-label">קונפליקטים</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.12)' }}>
            <Activity size={22} style={{ color: 'var(--warning)' }} />
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{stats.pendingSwaps + stats.weekRequests}</span>
            <span className="kpi-label">בקשות ממתינות</span>
          </div>
        </div>
      </div>

      {/* ===== CHARTS ROW ===== */}
      <div className="dash-charts-row">
        {/* Daily Coverage Chart */}
        <div className="dash-chart-card glass-panel">
          <h3 className="chart-title">כיסוי יומי</h3>
          <div className="coverage-bars">
            {stats.dailyCoverage.map(dc => (
              <div key={dc.day.idx} className="cov-bar-item">
                <div className="cov-bar-track">
                  <div
                    className="cov-bar-fill"
                    style={{ height: `${dc.rate}%`, background: getCoverageColor(dc.rate) }}
                  />
                </div>
                <span className="cov-bar-label">{dc.day.name.slice(0, 3)}</span>
                <span className="cov-bar-pct" style={{ color: getCoverageColor(dc.rate) }}>{dc.rate}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Staff Utilization */}
        <div className="dash-chart-card glass-panel">
          <h3 className="chart-title">ניצול עובדים</h3>
          <div className="util-list">
            {stats.workerUtil.slice(0, 10).map(({ emp, count, pct }) => (
              <div key={emp.id} className="util-row">
                <div className="util-avatar" style={{ borderColor: ROLE_COLORS[emp.roles?.[0]] || '#3b82f6' }}>
                  {emp.avatar}
                </div>
                <span className="util-name">{emp.name}</span>
                <div className="util-bar-track">
                  <div
                    className={`util-bar-fill ${pct > 100 ? 'over' : pct >= 100 ? 'full' : ''}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <span className={`util-count ${pct > 100 ? 'over' : pct >= 100 ? 'full' : ''}`}>
                  {count}/{emp.quota}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== QUOTA BALANCE ===== */}
      <div className="dash-balance glass-panel">
        <div className="balance-item">
          <TrendingUp size={18} />
          <span className="balance-label">סה״כ מכסות עובדים:</span>
          <span className="balance-val">{stats.totalQuota}</span>
        </div>
        <div className="balance-divider" />
        <div className="balance-item">
          <Clock size={18} />
          <span className="balance-label">משמרות לאיוש:</span>
          <span className="balance-val">{stats.totalSlots}</span>
        </div>
        <div className="balance-divider" />
        <div className={`balance-item ${stats.quotaDiff < 0 ? 'deficit' : 'surplus'}`}>
          <span className="balance-label">{stats.quotaDiff < 0 ? 'חוסר:' : stats.quotaDiff > 0 ? 'עודף:' : 'מאוזן'}</span>
          <span className="balance-val balance-diff">{Math.abs(stats.quotaDiff)}</span>
        </div>
      </div>

      {/* ===== STATUS CARDS ===== */}
      <div className="dash-status-row">
        <div className="status-card glass-panel">
          <h4>👥 סטטוס מכסות</h4>
          <div className="status-items">
            <div className="si">
              <CheckCircle2 size={14} className="si-icon si-ok" />
              <span>{stats.atQuota.length} עובדים מלאים</span>
            </div>
            <div className="si">
              <AlertTriangle size={14} className="si-icon si-warn" />
              <span>{stats.belowQuota.length} מתחת למכסה</span>
            </div>
            <div className="si">
              <XCircle size={14} className="si-icon si-err" />
              <span>{stats.overQuota.length} מעל למכסה</span>
            </div>
          </div>
        </div>

        <div className="status-card glass-panel">
          <h4>📬 פניות ובקשות</h4>
          <div className="status-items">
            <div className="si">
              <span className="si-emoji">🔄</span>
              <span>{stats.pendingSwaps} בקשות החלפה</span>
            </div>
            <div className="si">
              <span className="si-emoji">📋</span>
              <span>{stats.weekRequests} בקשות זמינות</span>
            </div>
            <div className="si">
              <span className="si-emoji">💬</span>
              <span>{stats.unreadNotes} הודעות חדשות</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
