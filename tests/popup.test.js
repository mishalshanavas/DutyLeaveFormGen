const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');
const core = require('../form-core.js');
const previews = require('../preview-store.js');
const { webcrypto } = require('node:crypto');
const tick = () => new Promise(resolve => setImmediate(resolve));
function harness() {
  const { document } = parseHTML(fs.readFileSync('popup.html', 'utf8'));
  // linkedom select.value lacks the browser setter; provide native-like behavior.
  for (const select of document.querySelectorAll('select')) {
    Object.defineProperty(select, 'value', { configurable: true, get() { return this._value || ''; }, set(value) { this._value = value; } });
  }
  let response = { profile: { name: 'TEST STUDENT', srNo: '123456' }, attendance: {
    studentName: 'TEST STUDENT', semester: '5', month: 9, year: 2026,
    periods: [{ id: '2026-09-07:1', date: '2026-09-07', period: 1, subject: 'Test' }] } };
  const memory = {}; let calls = 0; let gate = null;
  const chrome = {
    tabs: { query: async () => [{ id: 1, url: 'https://sahrdaya.etlab.in/attendance' }], create: async () => ({}) },
    scripting: { executeScript: async () => { calls++; if (gate) await gate; return [{ result: structuredClone(response) }]; } },
    storage: { session: { get: async key => key === null ? { ...memory } : { [key]: memory[key] },
      set: async values => Object.assign(memory, structuredClone(values)), remove: async keys => { for (const key of [].concat(keys)) delete memory[key]; } } },
    runtime: { getURL: path => `chrome-extension://test/${path}` }
  };
  const context = vm.createContext({ document, chrome, URL, DutyLeaveCore: core,
    DutyLeaveEtlab: { collectEtlabData() {} }, DutyLeavePreview: previews,
    console, setTimeout, Blob, fetch: async () => { throw new Error('PDF generation should not occur in these guard tests'); } });
  vm.runInContext(fs.readFileSync('popup.js', 'utf8'), context);
  return { document, chrome, memory, run: code => vm.runInContext(code, context),
    setResponse: value => { response = value; }, getResponse: () => structuredClone(response),
    calls: () => calls, gate: value => { gate = value; } };
}
test('refresh failures preserve entered fields and selection and block export', async () => {
  const app = harness(); await tick(); await tick();
  app.document.getElementById('program').value = 'Workshop';
  app.document.querySelector('input[name="absent[]"]').checked = true;
  app.document.querySelector('input[name="absent[]"]').setAttribute('checked', '');
  const failed = app.getResponse(); failed.profile = {}; failed.profileError = 'Profile timeout'; app.setResponse(failed);
  await app.run('refresh()');
  assert.equal(app.document.getElementById('program').value, 'Workshop');
  assert.equal(app.document.querySelector('input[name="absent[]"]').checked, true);
  assert.equal(app.document.getElementById('previewPdfBtn').disabled, true);
  assert.match(app.document.getElementById('status').textContent, /timeout/);
});
test('concurrent refresh is locked before asynchronous storage', async () => {
  const app = harness(); await tick(); await tick();
  const before = app.calls();
  let release; app.gate(new Promise(resolve => { release = resolve; }));
  const first = app.run('refresh()'); const second = app.run('refresh()');
  await tick(); assert.equal(app.calls(), before + 1); release(); await Promise.all([first, second]);
});
test('edit details unlocks profile fields and reset restores original profile', async () => {
  const app = harness(); await tick(); await tick();
  assert.equal(app.document.getElementById('name').readOnly, true);
  app.document.getElementById('editDetails').click();
  assert.equal(app.document.getElementById('name').readOnly, false);
  app.document.getElementById('name').value = 'Corrected name';
  app.document.getElementById('editDetails').click();
  assert.equal(app.document.getElementById('name').value, 'TEST STUDENT');
  assert.equal(app.document.getElementById('semester').disabled, true);
});
test('account changes are rejected on export before PDF assets load', async () => {
  const app = harness(); await tick(); await tick();
  for (const [id, value] of Object.entries({ program: 'Workshop', rollNo: '42', branch: 'CSE' })) app.document.getElementById(id).value = value;
  app.document.querySelector('input[name="absent[]"]').checked = true;
  app.document.querySelector('input[name="absent[]"]').setAttribute('checked', '');
  const changed = app.getResponse(); changed.profile.srNo = '999999'; app.setResponse(changed);
  await app.run('exportPdf({ preventDefault() {}, submitter: { id: "previewPdfBtn" } })');
  assert.match(app.document.getElementById('status').textContent, /student changed/);
  assert.equal(app.document.getElementById('previewPdfBtn').disabled, true);
});
test('preview survives popup recreation and supports reload, with bounded session retention', async () => {
  global.crypto ||= webcrypto;
  const app = harness(); await tick(); await tick();
  const url = await previews.create(app.chrome, 'data:application/pdf;base64,JVBERi0=');
  const id = new URL(url).searchParams.get('id');
  assert.equal(await previews.read(app.chrome, id), 'data:application/pdf;base64,JVBERi0=');
  assert.equal(await previews.read(app.chrome, id), 'data:application/pdf;base64,JVBERi0=');
  for (let i = 0; i < 9; i++) await previews.create(app.chrome, 'data:application/pdf;base64,JVBERi0=');
  assert.equal(Object.keys(app.memory).filter(key => key.startsWith('dutyLeavePreview:')).length, 8);
  await assert.rejects(previews.read(app.chrome, 'invalid'), /Invalid/);
});
