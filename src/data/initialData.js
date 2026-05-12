// ShiftSync Pro — Centralized Data Definitions

export const ROLES = ['שוטף', 'פרומו', 'מיוחדים', 'פרויקטים', 'מוטור', 'אינטרנט', 'פיתוח', 'שחר'];

export const ROLE_COLORS = {
  'שוטף': '#3b82f6',
  'פרומו': '#8b5cf6',
  'מיוחדים': '#ec4899',
  'פרויקטים': '#f59e0b',
  'מוטור': '#ef4444',
  'אינטרנט': '#10b981',
  'פיתוח': '#06b6d4',
  'שחר': '#f97316',
};

// activeDays: 0=ראשון, 1=שני, 2=שלישי, 3=רביעי, 4=חמישי, 5=שישי, 6=שבת
// dayOverrides: { dayIdx: { name?, hours? } } — per-day name/hours changes

export const INITIAL_SHIFT_DEFS = [
  // ===== Main Section =====
  {
    id: 't1', name: 'שחר', hours: '05:00 - 12:00', section: 'main', color: '#f97316',
    activeDays: [0, 1, 2, 3, 4, 5],
    dayOverrides: {}
  },
  {
    id: 't2', name: 'פיתוח', hours: '08:00 - 16:00', section: 'main', color: '#06b6d4',
    activeDays: [0, 1, 2, 3, 4, 5],
    dayOverrides: { 5: { name: 'מוטור', hours: '10:00 - 19:00' } }
  },
  {
    id: 't3', name: 'פרומו', hours: '09:00 - 17:00', section: 'main', color: '#8b5cf6',
    activeDays: [0, 1, 2, 3, 4],
    dayOverrides: {}
  },
  {
    id: 't4', name: 'מיוחדים', hours: '12:00 - 20:15', section: 'main', color: '#ec4899',
    activeDays: [0, 1, 2, 3, 4],
    dayOverrides: {}
  },
  {
    id: 't5', name: 'אמצע', hours: '12:00 - 20:15', section: 'main', color: '#3b82f6',
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    dayOverrides: { 5: { hours: '12:00 - 20:00' }, 6: { hours: '12:00 - 20:00' } }
  },
  {
    id: 't6', name: 'אמצע ב׳', hours: '13:00 - 21:30', section: 'main', color: '#6366f1',
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    dayOverrides: { 5: { hours: '13:00 - 22:00' }, 6: { hours: '13:00 - 22:00' } }
  },
  {
    id: 't7', name: 'חצות', hours: '15:00 - 00:00', section: 'main', color: '#64748b',
    activeDays: [0, 1, 2, 3, 4],
    dayOverrides: {}
  },

  // ===== Internet Section — only בוקר and ערב =====
  {
    id: 't8', name: 'בוקר', hours: '08:00 - 16:00', section: 'internet', color: '#10b981',
    activeDays: [0, 1, 2, 3, 4],
    dayOverrides: {}
  },
  {
    id: 't9', name: 'ערב', hours: '16:00 - 00:00', section: 'internet', color: '#14b8a6',
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    dayOverrides: {
      5: { hours: '12:00 - 22:00' },   // Friday
      6: { hours: '00:00 - 15:00' }    // Saturday
    }
  },
];

export const INITIAL_EMPLOYEES = [
  { id: 'e1', name: 'דנה', email: 'dana@example.com', phone: '050-1234567', eligibleShifts: ['t1','t2','t3','t5','t6'], roles: ['שוטף'], avatar: 'ד', quota: 5, active: true },
  { id: 'e2', name: 'נוי', email: 'noy@example.com', phone: '050-2345678', eligibleShifts: ['t3','t4','t5','t6'], roles: ['פרומו'], avatar: 'נ', quota: 5, active: true },
  { id: 'e3', name: 'ניצן', email: 'nitzan@example.com', phone: '050-3456789', eligibleShifts: ['t4','t5','t6','t7'], roles: ['מיוחדים'], avatar: 'נ', quota: 4, active: true },
  { id: 'e4', name: 'הודיה', email: 'hodaya@example.com', phone: '050-4567890', eligibleShifts: ['t2','t3','t5'], roles: ['פרויקטים'], avatar: 'ה', quota: 5, active: true },
  { id: 'e5', name: 'שירלי', email: 'shirly@example.com', phone: '050-5678901', eligibleShifts: ['t1','t2','t5','t6','t7'], roles: ['מוטור'], avatar: 'ש', quota: 3, active: true },
  { id: 'e6', name: 'לביא', email: 'lavi@example.com', phone: '050-6789012', eligibleShifts: ['t8','t9'], roles: ['אינטרנט'], avatar: 'ל', quota: 4, active: true },
  { id: 'e7', name: 'נעמה', email: 'naama@example.com', phone: '050-7890123', eligibleShifts: ['t1','t2','t3','t5','t6'], roles: ['שוטף'], avatar: 'נ', quota: 5, active: true },
  { id: 'e8', name: 'אירית', email: 'irit@example.com', phone: '050-8901234', eligibleShifts: ['t2','t3','t4','t5'], roles: ['פרויקטים','מיוחדים'], avatar: 'א', quota: 4, active: true },
  { id: 'e9', name: 'מאי', email: 'mai@example.com', phone: '050-9012345', eligibleShifts: ['t3','t4','t5','t6'], roles: ['פרומו'], avatar: 'מ', quota: 5, active: true },
  { id: 'e10', name: 'בראל', email: 'barel@example.com', phone: '050-0123456', eligibleShifts: ['t4','t5','t6','t7'], roles: ['מיוחדים'], avatar: 'ב', quota: 3, active: true },
  { id: 'e11', name: 'אור', email: 'or@example.com', phone: '052-1234567', eligibleShifts: ['t1','t2','t3','t5'], roles: ['שוטף'], avatar: 'א', quota: 5, active: true },
  { id: 'e12', name: 'ליאור', email: 'lior@example.com', phone: '052-2345678', eligibleShifts: ['t1','t2','t5','t6','t7'], roles: ['מוטור'], avatar: 'ל', quota: 4, active: true },
  { id: 'e13', name: 'יעל', email: 'yael@example.com', phone: '052-3456789', eligibleShifts: ['t8','t9'], roles: ['אינטרנט'], avatar: 'י', quota: 2, active: true },
  { id: 'e14', name: 'שיר', email: 'shir@example.com', phone: '052-4567890', eligibleShifts: ['t1','t2','t3','t5','t6'], roles: ['שוטף'], avatar: 'ש', quota: 5, active: true },
  { id: 'e15', name: 'איתי', email: 'itay@example.com', phone: '052-5678901', eligibleShifts: ['t2','t3','t4','t5','t6'], roles: ['פיתוח','פרומו'], avatar: 'א', quota: 5, active: true },
  { id: 'e16', name: 'מאור', email: 'maor@example.com', phone: '052-6789012', eligibleShifts: ['t1','t2','t5','t7'], roles: ['שוטף','מוטור'], avatar: 'מ', quota: 4, active: true },
  { id: 'e17', name: 'ים', email: 'yam@example.com', phone: '052-7890123', eligibleShifts: ['t2','t3','t5','t6'], roles: ['פיתוח'], avatar: 'י', quota: 4, active: true },
  { id: 'e18', name: 'עמרי', email: 'omri@example.com', phone: '052-8901234', eligibleShifts: ['t1','t2','t4','t5','t7'], roles: ['מיוחדים','שוטף'], avatar: 'ע', quota: 5, active: true },
  { id: 'e19', name: 'יעלי', email: 'yaeli@example.com', phone: '052-9012345', eligibleShifts: ['t3','t4','t5','t6'], roles: ['פרומו','מיוחדים'], avatar: 'י', quota: 4, active: true },
  { id: 'e20', name: 'שיר ש', email: 'shirs@example.com', phone: '053-1234567', eligibleShifts: ['t1','t2','t3','t5'], roles: ['שוטף'], avatar: 'ש', quota: 5, active: true },
];

export function getWeekDays(weekOffset = 0) {
  const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const today = new Date();
  const dayOfWeek = today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dayOfWeek + (weekOffset * 7));

  return dayNames.map((name, idx) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + idx);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return { idx, name, date: `${dd}/${mm}`, fullDate: d.toISOString().split('T')[0] };
  });
}

export function getWeekLabel(weekOffset = 0) {
  const days = getWeekDays(weekOffset);
  const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  const first = days[0];
  const last = days[6];
  const fParts = first.date.split('/');
  const lParts = last.date.split('/');
  const month = months[parseInt(lParts[1]) - 1];
  // Use actual year from the last day of the week for accuracy at year boundaries
  const year = last.fullDate.split('-')[0];
  return `${fParts[0]} - ${lParts[0]} ${month} ${year}`;
}

export function getShiftForDay(def, dayIdx) {
  if (!def.activeDays || !def.activeDays.includes(dayIdx)) {
    return null;
  }
  const override = def.dayOverrides?.[dayIdx];
  return {
    name: override?.name || def.name,
    hours: override?.hours || def.hours,
  };
}
