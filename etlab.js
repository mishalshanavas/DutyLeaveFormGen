/* Self-contained: Chrome serializes this function into the active Etlab tab. */
(function (root) {
  async function collectEtlabData(includeProfile = true) {
    const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
    const label = value => clean(value).toLowerCase().replace(/[^a-z0-9]/g, '');
    const selectValue = id => document.querySelector(`select#${id}`)?.value || '';
    const result = { profile: {}, profileError: '', attendance: null };
    if (location.origin !== 'https://sahrdaya.etlab.in') {
      throw new Error('Open the Sahrdaya Etlab attendance page first.');
    }
    function readProfile(doc) {
      const profile = {};
      // Exact labels only: never copy parents, bank details or other identifiers.
      for (const row of doc.querySelectorAll('table.detail-view tr')) {
        const key = label(row.querySelector('th')?.textContent);
        const value = clean(row.querySelector('td')?.textContent);
        if (key === 'name' && !profile.name) profile.name = value;
        if (key === 'srno' && !profile.srNo) profile.srNo = value;
      }
      return profile;
    }
    const table = document.querySelector('#itsthetable');
    if (table) {
      const month = Number(selectValue('month'));
      const year = Number(selectValue('year'));
      const semester = selectValue('semester');
      if (!Number.isInteger(month) || month < 1 || month > 12 ||
          !Number.isInteger(year) || year < 1900 || year > 2200 || !semester) {
        throw new Error('Could not read the attendance month, year or semester.');
      }
      const periods = [];
      const maxDay = new Date(year, month, 0).getDate();
      for (const row of table.querySelectorAll('tbody tr')) {
        const day = Number(clean(row.querySelector('th')?.textContent).match(/^\d+/)?.[0]);
        if (!day || day > maxDay || row.querySelector('td.holiday')) continue;
        const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        let period = 1;
        for (const cell of row.querySelectorAll('td')) {
          const span = Number(cell.getAttribute('colspan') || 1);
          if (!Number.isInteger(span) || span < 1 || period + span - 1 > 7) {
            throw new Error('The attendance table layout has changed. Refresh Etlab and try again.');
          }
          if (cell.classList.contains('absent')) {
            const anchor = cell.querySelector('a');
            // Exclude topic tooltips, including when the subject is in a nested element.
            const subjectNode = anchor?.cloneNode(true);
            subjectNode?.querySelectorAll('span, .tooltip').forEach(node => node.remove());
            const subject = clean(subjectNode?.textContent);
            for (let offset = 0; offset < span; offset++) {
              periods.push({ id: `${date}:${period + offset}`, date, period: period + offset, subject });
            }
          }
          period += span;
        }
      }
      const heading = Array.from(document.querySelectorAll('h1'))
        .map(node => clean(node.textContent)).find(text => /^View Attendance of /i.test(text));
      result.attendance = {
        month, year, semester, periods,
        studentName: heading?.replace(/^View Attendance of\s+/i, '') || ''
      };
    }
    if (includeProfile) {
      try {
        let doc = document;
        if (location.pathname !== '/student/profile') {
          const response = await fetch('/student/profile', {
            credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10000)
          });
          if (!response.ok || new URL(response.url, location.origin).pathname !== '/student/profile') {
            throw new Error('Sign in to Etlab to load your profile.');
          }
          doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        }
        result.profile = readProfile(doc);
        if (!result.profile.name || !result.profile.srNo) {
          throw new Error('Name or SR number was not found on the profile page. Enter missing details manually.');
        }
        if (result.attendance?.studentName &&
            clean(result.attendance.studentName).toLowerCase() !== clean(result.profile.name).toLowerCase()) {
          result.profile = {};
          result.attendance = null;
          throw new Error('The profile and attendance belong to different students. Reload Etlab before continuing.');
        }
      } catch (error) {
        result.profileError = error.message || 'Could not load your profile. Enter the details manually.';
      }
    }
    return result;
  }
  const api = { collectEtlabData };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DutyLeaveEtlab = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
