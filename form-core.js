(function (root) {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function dateLabel(date) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (!match) throw new Error('Invalid attendance date.');
    const [, year, month, day] = match;
    const maxDay = new Date(Number(year), Number(month), 0).getDate();
    if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > maxDay) {
      throw new Error('Invalid attendance date.');
    }
    return `${day} ${MONTHS[Number(month) - 1]} ${year}`;
  }
  function groupPeriods(periods) {
    const grouped = new Map();
    for (const entry of periods) {
      dateLabel(entry.date);
      if (!Number.isInteger(entry.period) || entry.period < 1 || entry.period > 7) {
        throw new Error('Invalid attendance period.');
      }
      if (!grouped.has(entry.date)) grouped.set(entry.date, new Set());
      grouped.get(entry.date).add(entry.period);
    }
    return Array.from(grouped, ([date, numbers]) => ({
      date, label: dateLabel(date), periods: Array.from(numbers).sort((a, b) => a - b)
    })).sort((a, b) => a.date.localeCompare(b.date));
  }
  function validate(fields, selected, attendance) {
    const required = { program: 'Program / event', name: 'Student name', rollNo: 'Roll number',
      srNo: 'SR number', semester: 'Semester', branch: 'Branch' };
    const clean = {};
    const limits = { program: 160, name: 100, rollNo: 16, srNo: 24, semester: 2, branch: 30, batch: 20 };
    for (const key of [...Object.keys(required), 'batch']) {
      clean[key] = String(fields[key] || '').replace(/\s+/g, ' ').trim();
      if (required[key] && !clean[key]) throw new Error(`${required[key]} is required.`);
      if (Array.from(clean[key]).length > limits[key]) throw new Error(`${required[key] || 'Batch'} is too long.`);
      if (/[\u0000-\u001f\u007f]/u.test(String(fields[key] || ''))) {
        throw new Error(`${required[key] || 'Batch'} contains unsupported control characters.`);
      }
    }
    if (!attendance) throw new Error('Open the Etlab attendance page and click Refresh.');
    if (clean.semester !== attendance.semester) throw new Error('Semester must match the attendance page.');
    if (!selected.length) throw new Error('Select at least one absent period.');
    const allowed = new Set(attendance.periods.map(entry => entry.id));
    for (const entry of selected) {
      const expectedId = `${entry.date}:${entry.period}`;
      if (entry.id !== expectedId || !allowed.has(expectedId)) {
        throw new Error('A selected period is no longer in this attendance table. Click Refresh.');
      }
      const [year, month] = entry.date.split('-').map(Number);
      if (year !== attendance.year || month !== attendance.month) throw new Error('Attendance dates do not match the loaded month.');
    }
    return { fields: clean, rows: groupPeriods(selected) };
  }
  function fingerprint(attendance) {
    return JSON.stringify(attendance ? {
      month: attendance.month, year: attendance.year, semester: attendance.semester,
      studentName: attendance.studentName,
      periods: attendance.periods.map(({ id, date, period, subject }) => ({ id, date, period, subject }))
    } : null);
  }
  const api = { MONTHS, dateLabel, groupPeriods, validate, fingerprint };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DutyLeaveCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
