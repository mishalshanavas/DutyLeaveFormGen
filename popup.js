/* global chrome, PDFLib, fontkit, DutyLeaveCore, DutyLeaveEtlab, DutyLeavePdf */
'use strict';
const $ = id => document.getElementById(id);
const fieldIds = ['program', 'name', 'rollNo', 'srNo', 'semester', 'branch', 'batch'];
let snapshot = null;
let sourceTabId = null;
let busy = false;
let loading = false;
const editedDuringLoad = new Set();
let previewUrl = null;
let assetsPromise = null;
let accountKey = '';
const selectedEntries = () => {
  const ids = new Set(Array.from(document.querySelectorAll('input[name="absent[]"]:checked'), cb => cb.value));
  return snapshot?.attendance?.periods.filter(entry => ids.has(entry.id)) || [];
};
function status(message, type = '') { $('status').textContent = message; $('status').className = type; }
function controls() {
  const enabled = !busy && Boolean(snapshot?.attendance?.periods.length);
  for (const id of ['previewPdfBtn', 'downloadPdfBtn', 'selectAll', 'clearSelection']) $(id).disabled = !enabled;
  $('refreshBtn').disabled = busy;
  $('forgetDraft').disabled = busy;
  for (const id of fieldIds) $(id).disabled = id === 'semester' || (busy && !loading);
  $('month').disabled = true;
  document.querySelectorAll('input[name="absent[]"]').forEach(cb => { cb.disabled = busy; });
}
function invalidatePreview() {
  $('pdfPreviewArea').replaceChildren();
  $('pdfPreviewArea').hidden = true;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
}
function selectionChanged() {
  const entries = selectedEntries();
  const dates = new Set(entries.map(entry => entry.date)).size;
  $('selectionCount').textContent = entries.length ? `${entries.length} selected · ${Math.ceil(dates / 18)} pages` : '0 selected';
  invalidatePreview();
  scheduleSave();
}
function renderAttendance() {
  const output = $('output');
  output.replaceChildren();
  const attendance = snapshot?.attendance;
  for (const [id, value, text] of [
    ['semester', attendance?.semester || '', attendance?.semester || 'From Etlab'],
    ['month', attendance ? String(attendance.month) : '', attendance ? `${DutyLeaveCore.MONTHS[attendance.month - 1]} ${attendance.year}` : 'From Etlab']
  ]) {
    const option = document.createElement('option'); option.value = value; option.textContent = text;
    $(id).replaceChildren(option); $(id).value = value;
  }
  if (!attendance?.periods.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.textContent = attendance ? 'No absent periods in this month.' : 'Open the attendance page and click Refresh.';
    row.append(cell); output.append(row);
  } else {
    const fragment = document.createDocumentFragment();
    for (const entry of attendance.periods) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox'; checkbox.name = 'absent[]'; checkbox.value = entry.id;
      checkbox.setAttribute('aria-label', `${DutyLeaveCore.dateLabel(entry.date)}, period ${entry.period}, ${entry.subject || 'subject unavailable'}`);
      cell.append(checkbox); row.append(cell);
      for (const value of [DutyLeaveCore.dateLabel(entry.date), entry.period, entry.subject || '—']) {
        const td = document.createElement('td'); td.textContent = String(value); row.append(td);
      }
      fragment.append(row);
    }
    output.append(fragment);
  }
  selectionChanged();
}
async function readSource(includeProfile) {
  if (!sourceTabId) throw new Error('Open the Etlab attendance page first.');
  const results = await chrome.scripting.executeScript({
    target: { tabId: sourceTabId }, func: DutyLeaveEtlab.collectEtlabData, args: [includeProfile]
  });
  if (!results?.[0]?.result) throw new Error('Etlab could not be read. Reload the page and try again.');
  return results[0].result;
}
async function saveDraft() {
  if (!snapshot || !accountKey || busy) return;
  const fields = Object.fromEntries(fieldIds.map(id => [id, $(id).value]));
  const draft = {
    accountKey, fields, profileBase: snapshot.profile,
    fingerprint: DutyLeaveCore.fingerprint(snapshot.attendance),
    selected: selectedEntries().map(entry => entry.id)
  };
  await chrome.storage.session.set({ dutyLeaveDraft: draft });
}
function scheduleSave() {
  // Start the storage request now; closing the popup must not cancel a debounce timer.
  void saveDraft().catch(() => status('Draft could not be saved. You can still export the form.', 'warning'));
}
async function refresh() {
  if (busy) return;
  try { await saveDraft(); } catch { /* Current form remains editable if session storage fails. */ }
  busy = true; loading = true; editedDuringLoad.clear(); controls(); invalidatePreview();
  status('Reading Etlab attendance and profile…');
  try {
    const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!active?.url || new URL(active.url).origin !== 'https://sahrdaya.etlab.in') {
      throw new Error('Open Sahrdaya Etlab attendance, then reopen this extension.');
    }
    sourceTabId = active.id;
    const next = await readSource(true);
    const nextKey = next.profile.name && next.profile.srNo ? `${next.profile.srNo}\u0000${next.profile.name}` : '';
    let draft;
    try { ({ dutyLeaveDraft: draft } = await chrome.storage.session.get('dutyLeaveDraft')); } catch { /* Optional draft restore. */ }
    // Preserve input typed during loading, but never carry a previous account's draft.
    for (const id of fieldIds) if (!editedDuringLoad.has(id)) $(id).value = '';
    snapshot = next; accountKey = nextKey;
    if (!editedDuringLoad.has('name')) $('name').value = next.profile.name || next.attendance?.studentName || '';
    if (!editedDuringLoad.has('srNo')) $('srNo').value = next.profile.srNo || '';
    renderAttendance();
    if (nextKey && draft?.accountKey === nextKey) {
      for (const id of ['program', 'rollNo', 'branch', 'batch']) if (!editedDuringLoad.has(id)) $(id).value = draft.fields?.[id] || '';
      if (draft.profileBase?.name === next.profile.name && draft.profileBase?.srNo === next.profile.srNo) {
        for (const id of ['name', 'srNo']) if (!editedDuringLoad.has(id)) $(id).value = draft.fields?.[id] || next.profile[id] || '';
      }
      if (draft.fingerprint === DutyLeaveCore.fingerprint(next.attendance)) {
        const selected = new Set(draft.selected || []);
        document.querySelectorAll('input[name="absent[]"]').forEach(cb => { cb.checked = selected.has(cb.value); });
      }
      selectionChanged();
    }
    if (next.profileError) status(next.profileError, 'warning');
    else if (!next.attendance) status('Profile loaded. Open the attendance page, then reopen the extension.', 'warning');
    else status(`Profile loaded · ${next.attendance.periods.length} absent periods in ${DutyLeaveCore.MONTHS[next.attendance.month - 1]} ${next.attendance.year}.`);
  } catch (error) {
    snapshot = null; sourceTabId = null; accountKey = '';
    for (const id of fieldIds) if (!editedDuringLoad.has(id)) $(id).value = '';
    renderAttendance();
    status(error.message || 'Could not read Etlab. Reload attendance and try again.', 'error');
  } finally {
    busy = false; loading = false; controls(); scheduleSave();
  }
}
async function loadAssets() {
  if (!assetsPromise) {
    assetsPromise = Promise.all([
      ['regular', 'fonts/LiberationSans-Regular.ttf'],
      ['bold', 'fonts/LiberationSans-Bold.ttf'],
      ['heading', 'tex/assets/Carlito-Bold.ttf'],
      ['malayalam', 'fonts/NotoSansMalayalam.ttf'],
      ['watermark', 'tex/assets/watermark.png']
    ].map(async ([key, path]) => {
      const response = await fetch(chrome.runtime.getURL(path));
      if (!response.ok) throw new Error(`A bundled PDF asset is missing: ${path}`);
      return [key, await response.arrayBuffer()];
    })).then(Object.fromEntries).catch(error => { assetsPromise = null; throw error; });
  }
  return assetsPromise;
}
async function rasterizeText(value, { width, size, minSize, field }) {
  await Promise.all([document.fonts.load('12px DutyLeaveSans'), document.fonts.load('12px DutyLeaveMalayalam')]);
  const scale = 4;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unicode rendering is unavailable in this browser.');
  const family = 'DutyLeaveSans, DutyLeaveMalayalam';
  const setFont = fontSize => { context.font = `${fontSize * scale}px ${family}`; };
  setFont(size);
  const measuredWidth = context.measureText(value).width / scale;
  const fittedSize = measuredWidth > width ? size * width / measuredWidth : size;
  if (fittedSize < minSize) throw new Error(`${field} is too long to fit legibly. Shorten it before exporting.`);
  setFont(fittedSize);
  const metrics = context.measureText(value);
  const ascent = Math.ceil(metrics.actualBoundingBoxAscent || fittedSize * scale);
  const descent = Math.ceil(metrics.actualBoundingBoxDescent || fittedSize * scale / 3);
  const left = Math.ceil(Math.max(0, metrics.actualBoundingBoxLeft));
  canvas.width = Math.ceil(Math.max(metrics.width, metrics.actualBoundingBoxRight) + left) + 4;
  canvas.height = ascent + descent + 4;
  setFont(fittedSize);
  context.fillStyle = '#000'; context.textBaseline = 'alphabetic';
  context.fillText(value, left + 2, ascent + 2);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Unicode rendering failed.');
  return { bytes: await blob.arrayBuffer(), width: canvas.width / scale,
    height: canvas.height / scale, belowBaseline: (descent + 2) / scale };
}
async function exportPdf(event) {
  event.preventDefault();
  if (busy) return;
  try {
    const fields = Object.fromEntries(fieldIds.map(id => [id, $(id).value]));
    const validated = DutyLeaveCore.validate(fields, selectedEntries(), snapshot?.attendance);
    busy = true; controls(); status('Checking attendance and preparing the form…');
    const current = await readSource(false);
    if (DutyLeaveCore.fingerprint(current.attendance) !== DutyLeaveCore.fingerprint(snapshot.attendance)) {
      throw new Error('Attendance changed since it was loaded. Click Refresh and select the periods again.');
    }
    const bytes = await DutyLeavePdf.generatePdf({ ...validated, assets: await loadAssets(),
      rasterizeText, PDFLib, fontkit });
    invalidatePreview();
    previewUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const previewLink = document.createElement('a');
    previewLink.href = previewUrl; previewLink.target = '_blank'; previewLink.rel = 'noopener';
    previewLink.textContent = 'Open PDF preview in a new tab';
    $('pdfPreviewArea').append(previewLink); $('pdfPreviewArea').hidden = false;
    if (event.submitter?.id === 'downloadPdfBtn') {
      // A data URL keeps the download independent of the popup's lifetime.
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not prepare the PDF download.'));
        reader.readAsDataURL(new Blob([bytes], { type: 'application/pdf' }));
      });
      await chrome.downloads.download({ url: dataUrl, saveAs: true,
        filename: `duty-leave-${snapshot.attendance.year}-${String(snapshot.attendance.month).padStart(2, '0')}.pdf` });
      status('PDF download started. Your preview is below.');
    } else {
      await chrome.tabs.create({ url: previewUrl });
      status(`Preview opened · ${validated.rows.length} dates · ${Math.ceil(validated.rows.length / 18)} pages.`);
    }
  } catch (error) {
    status(error.message || 'Could not generate the PDF. Please try again.', 'error');
  } finally {
    busy = false; controls(); scheduleSave();
  }
}
$('absentForm').addEventListener('submit', exportPdf);
$('absentForm').addEventListener('input', event => {
  if (loading && fieldIds.includes(event.target.id)) editedDuringLoad.add(event.target.id);
  invalidatePreview(); scheduleSave();
});
$('output').addEventListener('change', selectionChanged);
$('selectAll').addEventListener('click', () => {
  document.querySelectorAll('input[name="absent[]"]').forEach(cb => { cb.checked = true; }); selectionChanged();
});
$('clearSelection').addEventListener('click', () => {
  document.querySelectorAll('input[name="absent[]"]').forEach(cb => { cb.checked = false; }); selectionChanged();
});
$('refreshBtn').addEventListener('click', refresh);
$('forgetDraft').addEventListener('click', async () => {
  if (busy) return;
  busy = true; controls();
  try {
    await chrome.storage.session.remove('dutyLeaveDraft');
    for (const id of ['program', 'rollNo', 'branch', 'batch']) $(id).value = '';
    $('name').value = snapshot?.profile.name || snapshot?.attendance?.studentName || '';
    $('srNo').value = snapshot?.profile.srNo || '';
    document.querySelectorAll('input[name="absent[]"]').forEach(cb => { cb.checked = false; });
    selectionChanged();
    status('Draft cleared. Profile fields remain available.');
  } catch { status('Could not clear the draft. Try again.', 'error'); }
  finally { busy = false; controls(); }
});
refresh();
