(function (root) {
  async function generatePdf({ fields, rows, assets, rasterizeText, PDFLib, fontkit }) {
    if (!rows.length) throw new Error('Select at least one absent period.');
    const doc = await PDFLib.PDFDocument.create();
    doc.registerFontkit(fontkit);
    // Carlito's composite glyphs are lost by the bundled fontkit subsetter.
    // Embed complete fonts so headings render correctly in every PDF viewer.
    const font = await doc.embedFont(assets.regular);
    const headingFont = await doc.embedFont(assets.heading);
    const boldFont = await doc.embedFont(assets.bold);
    const watermark = await doc.embedPng(assets.watermark);
    const latinCharacters = new Set(font.getCharacterSet());
    const malayalamCharacters = new Set(fontkit.create(new Uint8Array(assets.malayalam)).characterSet);
    const unsupported = value => Array.from(value).find(char =>
      !latinCharacters.has(char.codePointAt(0)) && !malayalamCharacters.has(char.codePointAt(0)) &&
      !['\u200c', '\u200d'].includes(char));
    const fieldLabels = { program: 'Program / event', name: 'Student name', rollNo: 'Roll number',
      srNo: 'SR number', semester: 'Semester', branch: 'Branch', batch: 'Batch' };
    for (const [key, value] of Object.entries(fields)) {
      const missing = unsupported(value);
      if (missing) throw new Error(`${fieldLabels[key]}: the bundled fonts cannot render “${missing}”. Use English or Malayalam.`);
    }
    const black = PDFLib.rgb(0, 0, 0);
    function text(page, value, x, top, size = 12, selectedFont = font) {
      page.drawText(value, { x, y: 792 - top, size, font: selectedFont, color: black });
    }
    async function fitted(page, value, x, top, width, field, size = 12, minSize = 8) {
      if (!value) return;
      if (Array.from(value).some(char => !latinCharacters.has(char.codePointAt(0)))) {
        if (!rasterizeText) throw new Error('Unicode text rendering is unavailable.');
        const result = await rasterizeText(value, { width, size, minSize, field });
        const image = await doc.embedPng(result.bytes);
        page.drawImage(image, {
          x, y: 792 - top - result.belowBaseline,
          width: result.width, height: result.height
        });
        return;
      }
      const naturalWidth = font.widthOfTextAtSize(value, size);
      const fittedSize = naturalWidth > width ? size * width / naturalWidth : size;
      if (fittedSize < minSize) throw new Error(`${field} is too long to fit legibly. Shorten it before exporting.`);
      text(page, value, x, top, fittedSize);
    }
    const boundaries = [205.5, 228.5, 251.5, 273.5, 296.5, 319.5, 342.5,
      364.5, 387.5, 410.5, 433.5, 455.5, 478.5, 501.5, 524.5, 546.5, 569.5, 592.5, 615.5];
    function line(page, x1, y1, x2, y2) {
      page.drawLine({ start: { x: x1, y: 792 - y1 }, end: { x: x2, y: 792 - y2 }, thickness: 1, color: black });
    }
    const pageCount = Math.ceil(rows.length / 18);
    for (let pageNumber = 0; pageNumber < pageCount; pageNumber++) {
      const page = doc.addPage([612, 792]);
      page.drawImage(watermark, { x: 171, y: 240.51001, width: 270, height: 322.5 });
      const heading1 = 'SAHRDAYA COLLEGE OF ENGINEERING AND TECHNOLOGY, KODAKARA-680684';
      const heading2 = 'REQUEST FOR REGULARIZATION OF STUDENT ATTENDANCE';
      text(page, heading1, 64.890381, 53.502442, 15 * 482.219238 / headingFont.widthOfTextAtSize(heading1, 15), headingFont);
      text(page, heading2, 125.641067, 70.842284, 14 * 342.721686 / headingFont.widthOfTextAtSize(heading2, 14), headingFont);
      text(page, 'The following student has participated in a program under my supervision in connection with', 40.5, 95.947265);
      await fitted(page, fields.program, 40.5, 116.645507, 510, 'Program / event');
      text(page, 'Name:', 39.333984, 144.243164);
      await fitted(page, fields.name, 76, 144.243164, 200, 'Student name');
      text(page, 'Roll No:', 288, 144.243164);
      await fitted(page, fields.rollNo, 336, 144.243164, 51, 'Roll number');
      text(page, 'SR No:', 396, 144.243164);
      await fitted(page, fields.srNo, 436, 144.243164, 110, 'SR number');
      text(page, 'Semester:', 39.333984, 168.041992);
      await fitted(page, fields.semester, 99, 168.041992, 68, 'Semester');
      text(page, 'Branch:', 180, 168.041992);
      await fitted(page, fields.branch, 226, 168.041992, 51, 'Branch');
      text(page, 'Batch:', 288, 168.041992);
      await fitted(page, fields.batch, 329, 168.041992, 110, 'Batch');
      for (const x of [36.5, 135.5, 435.5, 550.5]) line(page, x, 180, x, 615);
      line(page, 36, 180.5, 551, 180.5);
      for (const top of boundaries) line(page, 36, top, top === 205.5 || top === 615.5 ? 551 : 435, top);
      text(page, 'Date', 41.25, 197.840819, 12, boldFont);
      text(page, 'Time', 141, 197.840819, 12, boldFont);
      text(page, 'Signature', 440.25, 197.840819, 12, boldFont);
      const chunk = rows.slice(pageNumber * 18, (pageNumber + 1) * 18);
      chunk.forEach((row, index) => {
        const baseline = (boundaries[index] + boundaries[index + 1]) / 2 + 3.5;
        text(page, row.label, 41.25, baseline, 10);
        text(page, row.periods.join(', '), 141, baseline, 11);
      });
      text(page, 'Kindly grant attendance for the above time periods.', 36, 639.709349);
      text(page, 'Issuing Faculty Name:', 36, 663.508179, 12, boldFont);
      text(page, 'Signature with Date:', 360, 663.508179, 12, boldFont);
      text(page, '- - - - - - - - - - - - - - - - - - - - - - - - - - For Office Use Only- - - - - - - - - - - - - - - - - - - - - - - - - -', 52.072266, 691.105839, 12, boldFont);
      text(page, 'Approved by Principal (Approved', 36, 718.703489, 12, boldFont);
      text(page, '/', 253.365232, 718.703489, 12, boldFont);
      text(page, 'Not Approved)', 273.369142, 718.703489, 12, boldFont);
      text(page, 'Signature with Date', 36, 756.301149, 12, boldFont);
      text(page, `Page ${pageNumber + 1} of ${pageCount}`, 480, 775, 9);
    }
    doc.setTitle('Duty Leave Application');
    doc.setCreator('Cook my DutyLeave');
    return doc.save();
  }
  const api = { generatePdf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DutyLeavePdf = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
