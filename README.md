# Cook my DutyLeave — Sahrdaya

A Chrome extension that reads absent periods from Sahrdaya Etlab and generates
college duty-leave forms locally.

Existing [Chrome Web Store listing](https://chromewebstore.google.com/detail/eocdlimiompkkofcmkmafkkklkhgcobj).
Updates in this repository require loading/reloading the local folder until
a new store release is published.

## Load or reload in Chrome

1. Open `chrome://extensions/` and enable Developer mode.
2. Choose **Load unpacked** and select this project folder, or click **Reload**
   on the existing extension after updating its files.
3. If Chrome asks for the updated permissions, review them. Access is limited
   to `https://sahrdaya.etlab.in/*`, plus script injection, local session drafts/previews and PDF downloads.
4. Sign in to Etlab. Open
   https://sahrdaya.etlab.in/ktuacademics/student/attendance and select the
   required month/year/semester before opening the extension.

Chrome 112 or newer is required. No Node.js or TeX installation is needed to
use the extension. Updating source files does not automatically reload an
already loaded extension.

## Use

- Use **Edit details** to unlock the autofilled name and SR number. **Use profile details** restores the verified values. Semester and attendance month remain tied to Etlab.
- Name and SR number are read from
  https://sahrdaya.etlab.in/student/profile using the existing signed-in
  session. Only these two profile fields are extracted.
- The inspected profile page does **not** expose the class roll number,
  academic branch or division. Enter those yourself. The profile's university
  registration number, entrance roll number and bank branch are not substitutes.
- Semester, month and year come from the displayed attendance table. To
  change them, change the Etlab page and click **Refresh** in the extension.
- Enter the program/event, select absent periods, then **Open preview** or
  **Download PDF**. Empty required fields, no selection, changed attendance,
  and text that cannot fit legibly block export.
- **Open preview** opens the generated PDF in a new tab directly. A preview
  link also remains available. A dedicated extension tab owns the PDF, so closing the popup or reloading the preview does not invalidate it. Up to eight previews are retained for up to 24 hours in this browser session.
- Each form holds 18 dates. Additional dates generate further forms with
  student details and signature areas repeated. Dates include their year.
- Latin and Malayalam input are supported. Malayalam is shaped by the
  browser and embedded as a high-resolution image, so that text is not
  searchable/editable in the PDF. Unsupported characters receive an error.
- Drafts and selected periods are saved locally in Chrome session storage
  only after a profile identity is verified. They survive closing the popup,
  but not restarting Chrome or reloading/disabling the extension. Drafts
  are never restored across different students. Selected periods are restored
  only when the attendance table is unchanged.
  **Forget draft** clears saved input and selections, but not previews or downloaded files.
- A failed refresh preserves the visible form and selections while disabling export. Retry Refresh after signing in or restoring connectivity. Export rechecks both profile identity and attendance; manually corrected fields do not change the verified account identity.

## PDF and LaTeX

The extension builds a fresh PDF from the replica's layout, with bundled
fonts and watermark. It does not paint data over the original PDF's dotted
placeholders and does not require a server or a TeX compiler.

The separately editable LaTeX replica is in `tex/duty-leave.tex`, with its
compiled blank form in `output/pdf/duty-leave.pdf`. See `tex/README.md` for
XeLaTeX/Tectonic instructions. **pdfLaTeX is not supported** by that source.
The standalone TeX replica still has its original fixed 18-row layout; the
extension's JavaScript PDF generator implements pagination. Both versions share field positions and widths from `layout.json`; run `npm run layout` after changes. TeX shrinks fields down to 8pt or rejects illegible overflow.

## Development and checks

```sh
npm ci
npm test
npm run test:ui
```

Open http://127.0.0.1:8765/test-popup for the popup UI harness. Its orange
banner identifies **synthetic profile/attendance data and mocked Chrome APIs**.
It exercises the real popup and PDF code, including session restoration,
account changes, month changes, and downloads. Captured test PDFs live under
`tmp/pdfs/`. The harness does not verify Chrome's actual injection, host
permissions or download dialogs; those need a loaded-extension smoke test.

Browser inspection and fixtures were checked against the live Etlab profile
and attendance pages on 12 October 2026. Automated tests cover required fields,
full dates, stale selections, profile label allowlisting, login failures,
account mismatch, table spans, fonts and multi-page output. Rendered PDFs
were also visually inspected because text extraction alone misses font bugs.

Runtime code: `popup.js`, `etlab.js`, `form-core.js`, `pdf-generator.js`.
UI: `popup.html`, `popup.css`. Fonts and PDF libraries are bundled locally.
Only read-only Etlab requests are made; the extension never submits a duty
leave application or edits a profile.

## License

Project code is MIT-licensed; see `LICENSE`. Fonts, libraries and college
artwork retain their own licenses/rights; see `THIRD_PARTY_NOTICES.md`.

## Contributors

- [mishalshanavas](https://github.com/mishalshanavas)
- [shayen71421](https://github.com/shayen71421)

## Chrome Web Store package

Run `npm run package` to build the runtime-only ZIP in `dist/`. It excludes tests, build tools, the Git repository and source PDFs. Version 1.3.0 includes a privacy page and correctly sized icons. Submission text, permission explanations and remaining publisher steps are in [store/SUBMISSION.md](store/SUBMISSION.md). A public policy URL, publisher access, artwork rights and a loaded-extension smoke test remain required before submission. The package has not been submitted or approved.
