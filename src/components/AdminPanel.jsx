import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from './ui/Toast';
import Modal from './ui/Modal';
import { ROLES, ROLE_COLORS } from '../data/initialData';
import { Users, Edit3, Trash2, Plus, Check, X, AlertTriangle, UserCheck, UserX, Mail, Phone, Search } from 'lucide-react';
import './AdminPanel.css';

export default function AdminPanel() {
  const { state, dispatch, weekKey, getWorkerShiftCount } = useApp();
  const toast = useToast();
  const { employees = [], assignments = [], swapRequests = [], shiftDefs = [], weekOffset } = state;

  const [editingEmp, setEditingEmp] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [empToDelete, setEmpToDelete] = useState(null);
  const [newEmp, setNewEmp] = useState({ name: '', email: '', phone: '', roles: ['שוטף'], quota: 5, eligibleShifts: [] });
  const [filterRole, setFilterRole] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [searchName, setSearchName] = useState('');

  // Stats
  const activeEmps = employees.filter(e => e.active);
  const totalAssigned = assignments.filter(a => a.weekKey === weekKey).length;
  const belowQuota = activeEmps.filter(e => getWorkerShiftCount(e.id) < (e.quota || 0));
  const aboveQuota = activeEmps.filter(e => getWorkerShiftCount(e.id) > (e.quota || 0));
  const pendingSwaps = swapRequests.filter(r => r.status === 'pending');

  const filteredEmps = employees
    .filter(e => filterRole === 'all' || (e.roles || []).includes(filterRole))
    .filter(e => searchName === '' || (e.name || '').toLowerCase().includes(searchName.toLowerCase()) || (e.email && e.email.toLowerCase().includes(searchName.toLowerCase())) || (e.phone && e.phone.includes(searchName)))
    .sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'quota') return (b.quota || 0) - (a.quota || 0);
      if (sortBy === 'shifts') return getWorkerShiftCount(b.id) - getWorkerShiftCount(a.id);
      return 0;
    });

  const handleSaveEdit = () => {
    if (!editingEmp) return;
    dispatch({ type: 'UPDATE_EMPLOYEE', payload: editingEmp });
    setEditingEmp(null);
    toast('פרטי עובד עודכנו', 'success');
  };

  const handleDeleteClick = (emp) => {
    setEmpToDelete(emp);
  };

  const confirmDelete = () => {
    if (empToDelete) {
      dispatch({ type: 'DELETE_EMPLOYEE', payload: empToDelete.id });
      toast(`${empToDelete.name} נמחק/ה`, 'warning');
      setEmpToDelete(null);
    }
  };

  const handleToggleActive = (emp) => {
    dispatch({ type: 'UPDATE_EMPLOYEE', payload: { id: emp.id, active: !emp.active } });
    toast(`${emp.name} ${emp.active ? 'הושבת/ה' : 'הופעל/ה'}`, 'info');
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newEmp.name.trim()) return;
    dispatch({
      type: 'ADD_EMPLOYEE',
      payload: {
        id: `e${Date.now()}`,
        name: newEmp.name,
        email: newEmp.email,
        phone: newEmp.phone,
        roles: newEmp.roles,
        eligibleShifts: shiftDefs.map(d => d.id),
        avatar: newEmp.name.charAt(0),
        quota: parseInt(newEmp.quota) || 5,
        active: true
      }
    });
    setShowAddModal(false);
    setNewEmp({ name: '', email: '', phone: '', roles: ['שוטף'], quota: 5, eligibleShifts: [] });
    toast('עובד חדש נוסף!', 'success');
  };

  const handleSwapDecision = (reqId, decision) => {
    dispatch({ type: 'UPDATE_SWAP_REQUEST', payload: { id: reqId, status: decision } });
    const req = swapRequests.find(r => r.id === reqId);
    const empName = employees.find(e => e.id === req?.empId)?.name || '';
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: { id: `n${Date.now()}`, text: `בקשת החלפה של ${empName} ${decision === 'approved' ? 'אושרה' : 'נדחתה'}`, type: decision === 'approved' ? 'success' : 'warning', timestamp: new Date().toISOString(), read: false }
    });
    toast(`בקשה ${decision === 'approved' ? 'אושרה' : 'נדחתה'}`, decision === 'approved' ? 'success' : 'warning');
  };

  return (
    <div className="admin-panel">
      <h2>ניהול עובדים ומשמרות</h2>

      {/* Stats Cards */}
      <div className="admin-stats-row">
        <div className="stat-card">
          <Users size={20} />
          <div className="stat-info">
            <span className="stat-num">{activeEmps.length}</span>
            <span className="stat-label">עובדים פעילים</span>
          </div>
        </div>
        <div className="stat-card warning-stat">
          <AlertTriangle size={20} />
          <div className="stat-info">
            <span className="stat-num">{belowQuota.length}</span>
            <span className="stat-label">מתחת למכסה</span>
          </div>
        </div>
        <div className="stat-card error-stat">
          <AlertTriangle size={20} />
          <div className="stat-info">
            <span className="stat-num">{aboveQuota.length}</span>
            <span className="stat-label">מעל למכסה</span>
          </div>
        </div>
        <div className="stat-card swap-stat">
          <span className="stat-icon-text">🔄</span>
          <div className="stat-info">
            <span className="stat-num">{pendingSwaps.length}</span>
            <span className="stat-label">בקשות ממתינות</span>
          </div>
        </div>
      </div>

      {/* Swap Requests */}
      {pendingSwaps.length > 0 && (
        <div className="swap-requests-section glass-panel">
          <h3>🔄 בקשות החלפה ממתינות</h3>
          <div className="swap-list">
            {pendingSwaps.map(req => {
              const emp = employees.find(e => e.id === req.empId);
              const fromDef = shiftDefs.find(d => d.id === req.fromShiftDefId);
              return (
                <div key={req.id} className="swap-item">
                  <div className="swap-info">
                    <span className="swap-emp-name">{emp?.name || '?'}</span>
                    <span className="swap-details">
                      מבקש/ת להחליף {fromDef?.name} ביום {req.fromDayIdx !== undefined ? ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'][req.fromDayIdx] : '?'}
                    </span>
                    {req.reason && <span className="swap-reason">סיבה: {req.reason}</span>}
                  </div>
                  <div className="swap-actions">
                    <button className="swap-approve" onClick={() => handleSwapDecision(req.id, 'approved')}>
                      <Check size={16} /> אשר
                    </button>
                    <button className="swap-reject" onClick={() => handleSwapDecision(req.id, 'rejected')}>
                      <X size={16} /> דחה
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Employee Table Controls */}
      <div className="emp-table-controls">
        <div className="emp-filters">
          <div className="emp-search-box">
            <Search size={14} />
            <input
              type="text"
              placeholder="חיפוש עובד..."
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
            />
          </div>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="filter-select">
            <option value="all">כל התפקידים</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="filter-select">
            <option value="name">מיון: שם</option>
            <option value="quota">מיון: מכסה</option>
            <option value="shifts">מיון: שיבוצים</option>
          </select>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> הוסף עובד
        </button>
      </div>

      {/* Employee Table */}
      <div className="emp-table-container glass-panel">
        <table className="emp-table">
          <thead>
            <tr>
              <th>שם</th>
              <th>תפקידים</th>
              <th>טלפון</th>
              <th>אימייל</th>
              <th>מכסה</th>
              <th>שיבוצים</th>
              <th>סטטוס</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmps.map(emp => {
              const count = getWorkerShiftCount(emp.id);
              return (
                <tr key={emp.id} className={!emp.active ? 'inactive-row' : ''}>
                  <td>
                    <div className="emp-name-cell">
                      <div className="table-avatar" style={{ borderColor: ROLE_COLORS[emp.roles?.[0]] || '#3b82f6' }}>{emp.avatar}</div>
                      <span>{emp.name}</span>
                    </div>
                  </td>
                  <td>
                    <div className="role-tags">
                      {(emp.roles || []).map(r => (
                        <span key={r} className="role-tag" style={{ color: ROLE_COLORS[r], borderColor: ROLE_COLORS[r] }}>{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="td-contact"><Phone size={13} /> {emp.phone || '—'}</td>
                  <td className="td-contact"><Mail size={13} /> {emp.email || '—'}</td>
                  <td className="td-center">{emp.quota}</td>
                  <td className="td-center">
                    <span className={`shift-count ${count > emp.quota ? 'count-over' : count >= emp.quota ? 'count-full' : ''}`}>
                      {count}/{emp.quota}
                    </span>
                  </td>
                  <td className="td-center">
                    <span className={`status-badge ${emp.active ? 'status-active' : 'status-inactive'}`}>
                      {emp.active ? 'פעיל' : 'מושבת'}
                    </span>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="tbl-btn edit-btn" onClick={() => setEditingEmp({ ...emp })} title="ערוך">
                        <Edit3 size={14} />
                      </button>
                      <button className="tbl-btn toggle-btn" onClick={() => handleToggleActive(emp)} title={emp.active ? 'השבת' : 'הפעל'}>
                        {emp.active ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                      <button className="tbl-btn delete-btn" onClick={() => handleDeleteClick(emp)} title="מחק">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Employee Modal */}
      {editingEmp && (
        <Modal title={`עריכת ${editingEmp.name}`} onClose={() => setEditingEmp(null)} width="500px">
          <div className="modal-form">
            <label>שם:</label>
            <input type="text" value={editingEmp.name} onChange={e => setEditingEmp({ ...editingEmp, name: e.target.value })} />
            <label>אימייל:</label>
            <input type="email" value={editingEmp.email || ''} onChange={e => setEditingEmp({ ...editingEmp, email: e.target.value })} />
            <label>טלפון:</label>
            <input type="tel" value={editingEmp.phone || ''} onChange={e => setEditingEmp({ ...editingEmp, phone: e.target.value })} />
            <label>מכסה שבועית:</label>
            <input type="number" value={editingEmp.quota} onChange={e => setEditingEmp({ ...editingEmp, quota: parseInt(e.target.value) || 1 })} min="1" max="21" />
            <label>תפקידים:</label>
            <div className="eligible-checkboxes">
              {ROLES.map(r => (
                <label key={r} className="eligible-check-item">
                  <input
                    type="checkbox"
                    checked={editingEmp.roles?.includes(r)}
                    onChange={e => {
                      const roles = e.target.checked
                        ? [...(editingEmp.roles || []), r]
                        : (editingEmp.roles || []).filter(x => x !== r);
                      setEditingEmp({ ...editingEmp, roles });
                    }}
                  />
                  <span style={{ color: ROLE_COLORS[r] }}>{r}</span>
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditingEmp(null)}>ביטול</button>
              <button className="btn-primary" onClick={handleSaveEdit}>שמור שינויים</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <Modal title="הוספת עובד חדש" onClose={() => setShowAddModal(false)} width="500px">
          <form onSubmit={handleAddSubmit} className="modal-form">
            <label>שם מלא:</label>
            <input type="text" value={newEmp.name} onChange={e => setNewEmp({ ...newEmp, name: e.target.value })} required />
            <label>אימייל:</label>
            <input type="email" value={newEmp.email} onChange={e => setNewEmp({ ...newEmp, email: e.target.value })} />
            <label>טלפון:</label>
            <input type="tel" value={newEmp.phone} onChange={e => setNewEmp({ ...newEmp, phone: e.target.value })} />
            <label>מכסה שבועית:</label>
            <input type="number" value={newEmp.quota} onChange={e => setNewEmp({ ...newEmp, quota: e.target.value })} min="1" max="21" />
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>ביטול</button>
              <button type="submit" className="btn-primary">שמור עובד</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {empToDelete && (
        <Modal title="אישור מחיקה" onClose={() => setEmpToDelete(null)} width="400px">
          <div className="modal-form">
            <p style={{ textAlign: 'center', marginBottom: '1rem', color: '#f87171' }}>
              בטוח למחוק את <strong>{empToDelete.name}</strong>?<br/>
              פעולה זו תמחק גם את כל השיבוצים שלו.
            </p>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => setEmpToDelete(null)}>ביטול</button>
              <button className="btn-primary" style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }} onClick={confirmDelete}>מחק עובד</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
