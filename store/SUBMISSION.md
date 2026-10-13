# Chrome Web Store submission — version 1.3.0

Run `npm ci`, `npm test`, then `npm run package`. Upload the ZIP in `dist/` to the existing listing if you own it; otherwise use your own developer listing. This package is prepared for submission, not a guarantee of approval.

## Listing text

Name: Cook my DutyLeave

Summary: Create duty-leave PDFs from selected Sahrdaya Etlab absences. Profile autofill, editable details and local PDF preview.

Description:

Create a printable duty-leave form from your Sahrdaya Etlab attendance. Sign in to Etlab, open attendance and choose a semester/month, then open the extension. Select absent periods, enter the program and class details, and open a PDF preview or save the PDF.

Name and SR number load from your profile and can be corrected with Edit details. Forms continue automatically after 18 dates. English and Malayalam input are supported. Your data stays on your device; only read-only requests to your Etlab account are made. Nothing is submitted to the college automatically.

An independent student helper, not affiliated with or endorsed by Sahrdaya or Etlab.

Single purpose: Generate printable duty-leave request PDFs from user-selected Sahrdaya Etlab absent periods and student details.

## Privacy disclosures and permissions

Publish `privacy.html` and `privacy.css` on a public HTTPS website (for example GitHub Pages) and enter that live URL in the dashboard. The packaged privacy page alone does not provide a public policy URL.

Declare personally identifiable information (name and SR number) and website content (attendance and profile fields). Do not claim that the extension handles no personal data just because processing is local. It does not collect financial/payment data, authentication credentials, health information, precise location, communications, broad browsing history or analytics. Verify the current dashboard categories match this description.

Certify that data is not sold, used beyond the single purpose, or used for lending/credit decisions. No remotely hosted executable code is used. All PDF libraries and fonts are bundled.

Permission justifications:
- `scripting`: read the displayed attendance and fetch/parse profile in Etlab's signed-in context.
- `storage`: keep a verified student's draft and generated previews in local session storage.
- `downloads`: save the generated PDF when requested.
- `https://sahrdaya.etlab.in/*`: read attendance and profile; the authenticated profile fetch cannot rely solely on temporary active-tab access across navigation.

## Remaining publisher tasks

- Confirm ownership/access to the existing listing and complete account verification required by Google.
- Confirm permission to distribute the supplied college watermark/artwork. The code license does not grant that permission.
- Upload a 128px icon and current screenshots (at least one 1280×800 or 640×400); use synthetic data or redact student details. Do not misrepresent mock screenshots as live data.
- Provide reviewer instructions for the login-only Etlab workflow. Use a dedicated authorized test account if required, never a student's credentials. The repository's synthetic harness is for development and is not shipped.
- In actual Chrome, load the `dist/` ZIP unpacked after extraction and verify profile permissions, Edit details, refresh failure, account changes, PDF preview after popup closure and tab reload, download/save dialog, and Malayalam rendering.
- Submit the ZIP and dashboard disclosures for review. No submission has been made by this build script.

Official guidance: https://developer.chrome.com/docs/webstore/publish/ and https://developer.chrome.com/docs/webstore/program-policies/policies
