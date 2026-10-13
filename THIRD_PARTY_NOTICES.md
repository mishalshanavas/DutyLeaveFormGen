# Third-party assets

- `lib/pdf-lib.min.js`: PDF-LIB, Andrew Dillon / Hopding, MIT.
  Source: https://github.com/Hopding/pdf-lib
- `lib/fontkit.umd.min.js`: `@pdf-lib/fontkit` 1.1.1, the PDF-LIB fork of
  Fontkit by Devon Govett, MIT. Source: https://github.com/Hopding/fontkit
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
