const test = require('node:test');
const { execFileSync } = require('node:child_process');
test('store ZIP has all local page assets and icons, restricted permissions and no development files', () => {
  execFileSync('python3', ['scripts/package-extension.py']);
  execFileSync('python3', ['-c', `
import json, re, zipfile
from pathlib import Path
version = json.loads(Path('manifest.json').read_text())['version']
with zipfile.ZipFile(f'dist/cook-my-dutyleave-{version}.zip') as archive:
    names = set(archive.namelist())
    m = json.loads(archive.read('manifest.json'))
    assert 'key' not in m and 'update_url' not in m
    assert m['permissions'] == ['scripting', 'storage', 'downloads']
    assert m['host_permissions'] == ['https://sahrdaya.etlab.in/*']
    assert not any(n.startswith(('tests/', 'node_modules/', '.git/', 'scripts/', 'store/')) for n in names)
    for size in (16, 32, 48, 128):
        png = archive.read(m['icons'][str(size)])
        assert int.from_bytes(png[16:20], 'big') == size
        assert int.from_bytes(png[20:24], 'big') == size
    for page in ('popup.html', 'preview.html', 'privacy.html'):
        for ref in re.findall(r'(?:src|href)="([^"]+)"', archive.read(page).decode()):
            if not ref.startswith(('https:', '#')):
                assert ref in names, (page, ref)
    for asset in ('lib/LICENSE-pdf-lib.md', 'lib/LICENSE-fontkit.md', 'fonts/Liberation-LICENSE', 'fonts/NotoSansMalayalam-OFL.txt'):
        assert len(archive.read(asset)) > 100
`]);
});
