"""Build a deterministic, runtime-only Chrome Web Store upload ZIP."""
from pathlib import Path
import json
import zipfile
ROOT = Path(__file__).resolve().parent.parent
FILES = ['manifest.json', 'popup.html', 'popup.css', 'popup.js', 'etlab.js', 'form-core.js',
         'pdf-generator.js', 'layout.js', 'preview-store.js', 'preview.html', 'preview.css',
         'preview.js', 'privacy.html', 'privacy.css', 'LICENSE', 'THIRD_PARTY_NOTICES.md',
         'lib/pdf-lib.min.js', 'lib/fontkit.umd.min.js', 'lib/LICENSE-pdf-lib.md', 'lib/LICENSE-fontkit.md', 'lib/versions.json',
         'fonts/LiberationSans-Regular.ttf', 'fonts/LiberationSans-Bold.ttf',
         'fonts/Liberation-LICENSE', 'fonts/NotoSansMalayalam.ttf', 'fonts/NotoSansMalayalam-OFL.txt',
         'tex/assets/Carlito-Bold.ttf', 'tex/assets/Carlito-OFL.txt', 'tex/assets/watermark.png']
FILES += [f'icons/icon-{size}.png' for size in (16, 32, 48, 128)]
manifest = json.loads((ROOT / 'manifest.json').read_text())
# The unpacked key preserves the existing development ID; the store owns release IDs.
manifest.pop('key', None)
manifest.pop('update_url', None)
output = ROOT / f'dist/cook-my-dutyleave-{manifest["version"]}.zip'
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for name in sorted(FILES):
        data = (json.dumps(manifest, indent=2) + '\n').encode() if name == 'manifest.json' else (ROOT / name).read_bytes()
        info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        archive.writestr(info, data)
print(output)
