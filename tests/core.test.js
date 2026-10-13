const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { parseHTML, DOMParser } = require('linkedom');
const core = require('../form-core.js');
const { generatePdf } = require('../pdf-generator.js');
const PDFLib = require('../lib/pdf-lib.min.js');
const fontkit = require('../lib/fontkit.umd.min.js');

const profile = `<table class="detail-view"><tr><th>Name</th><td>TEST STUDENT</td></tr>
  <tr><th>SR No</th><td>123456</td></tr><tr><th>Father's Name</th><td>DO NOT COPY</td></tr>
  <tr><th>Branch</th><td>BANK BRANCH, NOT COURSE</td></tr><tr><th>Account no</th><td>DO NOT COPY</td></tr></table>`;
const attendanceHtml = (cells = `<td class="absent"><a><strong>Networks - Lab</strong><span>Private tooltip</span></a></td>
  <td class="present"></td><td class="absent" colspan="2"><a>Software</a></td>`) => `<html><body>
  <h1>View Attendance of TEST STUDENT</h1><div id="semester"></div>
  <select id="semester"><option value="5" selected>Vth Semester</option></select>
  <select id="month"><option value="9" selected>Sep</option></select>
  <select id="year"><option value="2026" selected>2026</option></select>
  <table id="itsthetable"><tbody><tr><th>7<sup>th</sup></th>${cells}</tr>
  <tr><th>8th</th><td class="holiday" colspan="7"></td></tr>
  <tr><th>31st</th><td class="absent"></td></tr><tr><td>summary</td></tr></tbody></table>
  </body></html>`;
function reader(html, options = {}) {
  const { document } = parseHTML(html);
  const context = {
    document, location: { origin: 'https://sahrdaya.etlab.in', pathname: options.path || '/ktuacademics/student/attendance' },
    DOMParser, AbortSignal, URL, module: { exports: {} },
    fetch: options.fetch || (async () => ({ ok: true, url: 'https://sahrdaya.etlab.in/student/profile', text: async () => profile }))
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../etlab.js'), 'utf8'), context);
  return context.module.exports.collectEtlabData;
}
const fields = { program: 'Robotics & Design Workshop', name: 'TEST STUDENT', rollNo: '42',
  srNo: '123456', semester: '5', branch: 'CSE', batch: 'A' };
const entry = (day = 7, period = 1) => {
  const date = `2026-09-${String(day).padStart(2, '0')}`;
  return { id: `${date}:${period}`, date, period, subject: 'Networks' };
};
const attendance = { month: 9, year: 2026, semester: '5', studentName: fields.name, periods: [entry()] };

test('extracts year, numeric month, semester, nested subject and spanned periods', async () => {
  const result = await reader(attendanceHtml())();
  assert.equal(result.attendance.month, 9);
  assert.equal(result.attendance.year, 2026);
  assert.equal(result.attendance.semester, '5');
  assert.deepEqual(Array.from(result.attendance.periods, row => row.period), [1, 3, 4]);
  assert.equal(result.attendance.periods[0].subject, 'Networks - Lab');
  assert.equal(result.attendance.periods[0].date, '2026-09-07');
});
test('profile allowlist copies only student name and SR number', async () => {
  const result = await reader(profile, { path: '/student/profile' })();
  assert.deepEqual(JSON.parse(JSON.stringify(result.profile)), { name: 'TEST STUDENT', srNo: '123456' });
  assert.equal(result.attendance, null);
});
test('expired login is surfaced without copying login page fields', async () => {
  const result = await reader(attendanceHtml(), { fetch: async () => ({ ok: true, url: 'https://sahrdaya.etlab.in/user/login' }) })();
  assert.match(result.profileError, /Sign in/);
  assert.equal(Object.keys(result.profile).length, 0);
  assert.ok(result.attendance);
});
test('does not combine different students profile and attendance', async () => {
  const result = await reader(attendanceHtml().replace('View Attendance of TEST STUDENT', 'View Attendance of ANOTHER STUDENT'))();
  assert.match(result.profileError, /different students/);
  assert.equal(result.attendance, null);
  assert.equal(Object.keys(result.profile).length, 0);
});
test('freshness check reads attendance without fetching private profile again', async () => {
  const result = await reader(attendanceHtml(), { fetch: () => { throw new Error('Unexpected fetch'); } })(false);
  assert.equal(result.profileError, '');
  assert.equal(result.attendance.periods.length, 3);
});
test('reader remains self-contained when serialized like Chrome script injection', async () => {
  const fn = reader(attendanceHtml());
  const { document } = parseHTML(attendanceHtml());
  const context = { document, location: { origin: 'https://sahrdaya.etlab.in', pathname: '/ktuacademics/student/attendance' } };
  vm.createContext(context);
  const result = await vm.runInContext(`(${fn.toString()})(false)`, context);
  assert.equal(result.attendance.periods.length, 3);
});
test('refuses unexpected table spans instead of shifting period numbers', async () => {
  await assert.rejects(reader(attendanceHtml('<td class="absent" colspan="8"></td>'))(), /layout has changed/);
});
test('required and whitespace-only details block export', () => {
  for (const key of ['program', 'name', 'rollNo', 'srNo', 'semester', 'branch']) {
    assert.throws(() => core.validate({ ...fields, [key]: '   ' }, [entry()], attendance), /required/);
  }
  assert.throws(() => core.validate(fields, [], attendance), /at least one/);
});
test('optional division can be blank and fields are normalized', () => {
  const result = core.validate({ ...fields, batch: '', name: ' TEST  STUDENT ' }, [entry()], attendance);
  assert.equal(result.fields.name, 'TEST STUDENT');
  assert.equal(result.fields.batch, '');
});
test('rejects stale, forged, wrong-month and wrong-semester selections', () => {
  assert.throws(() => core.validate(fields, [entry(8)], attendance), /no longer/);
  assert.throws(() => core.validate(fields, [{ ...entry(), period: 2 }], attendance), /no longer/);
  assert.throws(() => core.validate(fields, [entry()], { ...attendance, month: 10 }), /dates do not match/);
  assert.throws(() => core.validate({ ...fields, semester: '4' }, [entry()], attendance), /Semester must match/);
});
test('grouping sorts dates and periods, deduplicates and keeps year', () => {
  const rows = core.groupPeriods([entry(9, 4), entry(7, 3), entry(7, 1), entry(7, 1)]);
  assert.deepEqual(rows, [
    { date: '2026-09-07', label: '07 Sep 2026', periods: [1, 3] },
    { date: '2026-09-09', label: '09 Sep 2026', periods: [4] }
  ]);
  assert.equal(core.dateLabel('2024-02-29'), '29 Feb 2024');
  assert.throws(() => core.dateLabel('2026-02-29'), /Invalid/);
});
test('fingerprint detects changed attendance or account context', () => {
  assert.notEqual(core.fingerprint(attendance), core.fingerprint({ ...attendance, studentName: 'OTHER STUDENT' }));
  assert.notEqual(core.fingerprint(attendance), core.fingerprint({ ...attendance, periods: [] }));
});
const assets = {
  regular: fs.readFileSync('fonts/LiberationSans-Regular.ttf'),
  bold: fs.readFileSync('fonts/LiberationSans-Bold.ttf'),
  heading: fs.readFileSync('tex/assets/Carlito-Bold.ttf'),
  malayalam: fs.readFileSync('fonts/NotoSansMalayalam.ttf'),
  watermark: fs.readFileSync('tex/assets/watermark.png')
};
test('PDF has two complete letter-size forms for 21 dates and fits a long name', async () => {
  const bytes = await generatePdf({ fields: { ...fields, name: 'ALEXANDER CHRISTOPHER THOMAS' },
    rows: core.groupPeriods(Array.from({ length: 21 }, (_, i) => entry(i + 1))), assets, PDFLib, fontkit });
  const doc = await PDFLib.PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 2);
  for (const page of doc.getPages()) assert.deepEqual(page.getSize(), { width: 612, height: 792 });
  fs.mkdirSync('tmp/pdfs', { recursive: true });
  fs.writeFileSync('tmp/pdfs/paginated-test.pdf', bytes);
});
test('PDF refuses zero dates and illegible field overflow', async () => {
  await assert.rejects(generatePdf({ fields, rows: [], assets, PDFLib, fontkit }), /at least one/);
  await assert.rejects(generatePdf({ fields: { ...fields, name: 'W'.repeat(100) },
    rows: core.groupPeriods([entry()]), assets, PDFLib, fontkit }), /too long to fit legibly/);
});
test('Malayalam uses the shaped browser rasterizer, unsupported glyphs fail clearly', async () => {
  await assert.rejects(generatePdf({ fields: { ...fields, name: 'മിശാൽ' },
    rows: core.groupPeriods([entry()]), assets, PDFLib, fontkit }), /Unicode text rendering is unavailable/);
  await assert.rejects(generatePdf({ fields: { ...fields, name: '😀' },
    rows: core.groupPeriods([entry()]), assets, PDFLib, fontkit }), /cannot render/);
});
test('manifest permissions are restricted and all popup assets exist', () => {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  assert.deepEqual(manifest.host_permissions, ['https://sahrdaya.etlab.in/*']);
  assert.ok(!manifest.permissions.includes('cookies'));
  const csp = manifest.content_security_policy.extension_pages;
  const directives = Object.fromEntries(csp.split(';').filter(value => value.trim()).map(value => {
    const [name, ...sources] = value.trim().split(/\s+/);
    return [name, sources];
  }));
  // Chrome rejects blob: (and other insecure sources) in MV3 object-src.
  assert.deepEqual(directives['object-src'], ["'self'"]);
  assert.deepEqual(directives['script-src'], ["'self'"]);
  const { document } = parseHTML(fs.readFileSync('popup.html', 'utf8'));
  for (const el of document.querySelectorAll('script[src], link[href]')) {
    assert.ok(fs.existsSync(el.getAttribute('src') || el.getAttribute('href')));
  }
});

// Even incomplete profiles must never bypass the account mismatch guard.
test('partial profile belonging to another student is rejected', async () => {
  const partial = '<table class="detail-view"><tr><th>Name</th><td>OTHER STUDENT</td></tr></table>';
  const result = await reader(attendanceHtml(), { fetch: async () => ({ ok: true,
    url: 'https://sahrdaya.etlab.in/student/profile', text: async () => partial }) })();
  assert.match(result.profileError, /different students/);
  assert.equal(result.attendance, null);
  assert.equal(Object.keys(result.profile).length, 0);
});

test('vendored library hashes match recorded versions', () => {
  const crypto = require('node:crypto');
  for (const asset of JSON.parse(fs.readFileSync('lib/versions.json', 'utf8'))) {
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(`lib/${asset.file}`)).digest('hex'), asset.sha256);
  }
});
