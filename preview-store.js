(function (root) {
  const PREFIX = 'dutyLeavePreview:';
  const MAX_AGE = 24 * 60 * 60 * 1000;
  async function create(chrome, dataUrl) {
    const now = Date.now();
    const existing = await chrome.storage.session.get(null);
    const expired = Object.entries(existing).filter(([key, value]) => key.startsWith(PREFIX) &&
      (!value?.created || now - value.created > MAX_AGE)).map(([key]) => key);
    if (expired.length) await chrome.storage.session.remove(expired);
    const retained = Object.entries(existing).filter(([key]) => key.startsWith(PREFIX) && !expired.includes(key)).sort((a, b) => a[1].created - b[1].created);
    // Conservatively budget two bytes per base64 character plus storage overhead.
    // Chrome 112+ session quota is 10 MB; reserve room for drafts and metadata.
    if (dataUrl.length > 3_500_000) throw new Error('PDF is too large for a session preview. Use Download PDF instead.');
    let used = retained.reduce((total, [, value]) => total + (value.dataUrl?.length || 0), 0);
    const remove = [];
    while (retained.length >= 8 || used + dataUrl.length > 3_500_000) {
      const [key, value] = retained.shift(); remove.push(key); used -= value.dataUrl?.length || 0;
    }
    if (remove.length) await chrome.storage.session.remove(remove);
    const id = crypto.randomUUID();
    await chrome.storage.session.set({ [PREFIX + id]: { created: now, dataUrl } });
    return chrome.runtime.getURL(`preview.html?id=${id}`);
  }
  async function read(chrome, id) {
    if (!/^[a-f0-9-]{36}$/.test(id || '')) throw new Error('Invalid preview link.');
    const key = PREFIX + id;
    const entry = (await chrome.storage.session.get(key))[key];
    if (!entry || Date.now() - entry.created > MAX_AGE) throw new Error('Preview expired. Open the extension and generate it again.');
    if (!entry.dataUrl?.startsWith('data:application/pdf;base64,')) throw new Error('Preview data is invalid.');
    return entry.dataUrl;
  }
  const api = { create, read };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DutyLeavePreview = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
