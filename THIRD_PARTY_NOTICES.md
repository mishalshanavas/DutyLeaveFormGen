# Third-party assets

- `lib/pdf-lib.min.js`: PDF-LIB 1.17.1, Andrew Dillon / Hopding, MIT.
  Full notice: `lib/LICENSE-pdf-lib.md`.
  Source: https://github.com/Hopding/pdf-lib
- `lib/fontkit.umd.min.js`: `@pdf-lib/fontkit` 1.1.1, the PDF-LIB fork of
  Fontkit by Devon Govett, MIT. Full notice: `lib/LICENSE-fontkit.md`. Source: https://github.com/Hopding/fontkit
  The complete UMD distribution is bundled locally; no CDN is used at runtime.
- `fonts/LiberationSans-*.ttf`: Liberation Fonts, SIL Open Font License 1.1.
  Full notice: `fonts/Liberation-LICENSE`.
- `fonts/NotoSansMalayalam.ttf`: Noto Sans Malayalam, SIL Open Font License 1.1.
  Full notice: `fonts/NotoSansMalayalam-OFL.txt`.
- `tex/assets/Carlito-Bold.ttf`: Carlito, SIL Open Font License 1.1.
  Full notice: `tex/assets/Carlito-OFL.txt`.
- `DutyLeaveForm.pdf` and the watermark extracted into
  `tex/assets/watermark.png`: supplied college form/artwork. Rights remain
  with their original owner; the project code license does not cover them.

Development-only dependency `linkedom` is ISC-licensed and is excluded from
the extension package. Its upstream notices remain in `node_modules`.

Vendored JS versions and SHA-256 digests are tracked in `lib/versions.json`.
These files are not covered by npm audit; compare upstream release notes and
security advisories before upgrading them. `npm test` verifies their digests.
