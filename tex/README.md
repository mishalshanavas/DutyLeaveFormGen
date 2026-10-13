# Editable duty-leave form replica

`duty-leave.tex` reconstructs the original US Letter form using editable TeX
text and vector rules. Only the watermark is an image; the original PDF is
not embedded as a background.

## Build

Install Tectonic (or XeLaTeX). Arial is used when installed. For Overleaf,
upload your licensed `arial.ttf` and `arialbd.ttf` into `tex/assets/`
(`assets/` when the TeX folder is your project root). Then:

```sh
mkdir -p output/pdf
cd tex
tectonic duty-leave.tex --outdir ../output/pdf
# Alternatively: xelatex -output-directory=../output/pdf duty-leave.tex
```

Tectonic downloads its TeX packages on the first build. All text, including
bold headings, now prefers Arial. This machine does not have Arial installed;
its compiled sample uses the bundled Arial-compatible Liberation Sans fonts
from `../fonts/`, with an explicit build warning. Include that folder when
uploading the whole project unless you supply Arial. Genuine Arial font files
are not redistributed with this project. Small glyph-shape differences remain
when using the fallback.

## Edit

Set the named commands near the top of the source (`EventName`,
`StudentName`, `RollNumber`, `SRNumber`, `Semester`, `Branch`, `Batch`).
Empty values retain the original dotted placeholders. Add entries at the
marked location, for example:

```tex
\AttendanceRow{1}{07 Oct 2026}{1, 2, 3}
\AttendanceRow{2}{08 Oct 2026}{4, 5}
```

This first version intentionally preserves the original 18-row, one-page
layout. It is not yet a flowing or paginated document generator. Long field
values must be checked for fit; rows outside 1--18 produce a compilation
error. Unicode coverage depends on the selected font: these Latin fonts do
not provide Malayalam support. Dynamic input must be escaped for TeX
(particularly backslashes, braces, `%`, `&`, `_`, `#`, and `$`).

The extension uses its JavaScript PDF generator. No TeX compiler is needed
inside Chrome.

## Assets

`watermark.png` was extracted from the supplied form, preserving its
128/255 opacity and original aspect ratio. Its rights remain with the
original owner.
