'use strict';
const syntheticSnapshot = () => {
  const scenario = document.getElementById('testScenario')?.value || 'normal';
  const other = scenario === 'other-account';
  const month = scenario === 'changed-month' ? 10 : 9;
  const periods = scenario === 'no-absences' ? [] : Array.from({ length: 21 }, (_, index) => {
    const date = `2026-${String(month).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`;
    return { id: `${date}:1`, date, period: 1,
      subject: index === 0 ? '<img src=x onerror=alert(1)> - Networks' : 'Software Engineering' };
  });
  return {
    profile: scenario === 'profile-error' ? {} : { name: other ? 'OTHER STUDENT' : 'TEST STUDENT', srNo: other ? '654321' : '123456' },
    profileError: scenario === 'profile-error' ? 'Sign in to Etlab to load your profile.' : '',
    attendance: { month, year: 2026, semester: '5', studentName: other ? 'OTHER STUDENT' : 'TEST STUDENT', periods }
  };
};
const storage = {
  async get(key) { if (key === null) return Object.fromEntries(Object.keys(sessionStorage).map(k => [k, JSON.parse(sessionStorage.getItem(k))])); return { [key]: JSON.parse(sessionStorage.getItem(key) || 'null') }; },
  async set(values) { for (const [key, value] of Object.entries(values)) sessionStorage.setItem(key, JSON.stringify(value)); },
  async remove(key) { for (const k of Array.isArray(key) ? key : [key]) sessionStorage.removeItem(k); }
};
window.chrome = {
  tabs: {
    async query() { return [{ id: 1, url: 'https://sahrdaya.etlab.in/ktuacademics/student/attendance' }]; },
    async create({ url }) {
      const result = document.getElementById('testDownload');
      result.textContent = 'Preview tab opened (mock Chrome API)'; result.href = url; result.hidden = false;
      return { id: 2, url };
    }
  },
  scripting: { async executeScript() {
    if (document.getElementById('testScenario')?.value === 'slow-profile') {
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    return [{ result: syntheticSnapshot() }];
  } },
  storage: { session: storage },
  runtime: { getURL: path => new URL(path, location.origin).href },
  downloads: { async download(options) {
    const response = await fetch('/__test_download', { method: 'POST', body: options.url });
    if (!response.ok) throw new Error('Test download capture failed.');
    const result = document.getElementById('testDownload');
    result.textContent = `Captured PDF: ${options.filename}`;
    result.href = '/tmp/pdfs/ui-test.pdf'; result.hidden = false;
    return 1;
  } }
};
document.addEventListener('DOMContentLoaded', () => {
  const panel = document.createElement('aside');
  panel.style.cssText = 'padding:10px;background:#ffedd5;margin-bottom:12px';
  const title = document.createElement('strong');
  title.textContent = 'TEST HARNESS — synthetic data, mocked Chrome APIs';
  const label = document.createElement('label'); label.textContent = 'Test scenario'; label.htmlFor = 'testScenario';
  const select = document.createElement('select'); select.id = 'testScenario';
  for (const scenario of ['normal', 'slow-profile', 'changed-month', 'other-account', 'profile-error', 'no-absences']) {
    const option = document.createElement('option'); option.value = scenario; option.textContent = scenario; select.append(option);
  }
  const link = document.createElement('a'); link.id = 'testDownload'; link.hidden = true;
  panel.append(title, label, select, document.createElement('br'), link);
  document.body.prepend(panel);
});
