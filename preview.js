/* global chrome, DutyLeavePreview */
(async () => {
  let url;
  try {
    const dataUrl = await DutyLeavePreview.read(chrome, new URL(location.href).searchParams.get('id'));
    const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), char => char.charCodeAt(0));
    url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const viewer = document.getElementById('viewer'); viewer.src = url; viewer.hidden = false;
    const download = document.getElementById('download'); download.href = url; download.hidden = false;
    document.getElementById('status').textContent = 'Stored locally for up to 24 hours in this browser session.';
    window.addEventListener('pagehide', event => { if (!event.persisted) URL.revokeObjectURL(url); }, { once: true });
  } catch (error) { document.getElementById('status').textContent = error.message || 'Could not open preview.'; }
})();
