const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const layout = JSON.parse(fs.readFileSync(path.join(root, 'layout.json'), 'utf8'));
const outputs = {
  'layout.js': `// Generated from layout.json. Run npm run layout after changes.\n(function(root) {\n  const fields = ${JSON.stringify(layout)};\n  if (typeof module !== 'undefined' && module.exports) module.exports = fields;\n  else root.DutyLeaveLayout = fields;\n})(typeof globalThis !== 'undefined' ? globalThis : this);\n`,
  'tex/layout-fields.tex': '% Generated from layout.json.\n' + Object.entries(layout).map(([key, [x, y, width]]) => `\\expandafter\\def\\csname Field${key}\\endcsname#1{\\Text{${x}}{${y}}{\\Field{#1}{${width}}}}`).join('\n') + '\n'
};
for (const [file, content] of Object.entries(outputs)) {
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(path.join(root, file), 'utf8') !== content) throw new Error(`${file} is stale. Run npm run layout.`);
  } else fs.writeFileSync(path.join(root, file), content);
}
