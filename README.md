# 📄 Duty Leave Form Generator Extension

A simple browser extension to generate and preview duty leave forms with student details and absent periods. Built using HTML, CSS, and JavaScript, this extension simplifies the process of filling and downloading duty leave forms as PDFs.

---

## 📦 Installation

### Option 1: Clone the Repository (Recommended)

1. Open your terminal and clone the repository:
   ```bash
   git clone https://github.com/mishalshanavas/DutyLeaveFormGen.git
   ```
2. Open the folder in **VS Code**:
   ```bash
   cd DutyLeaveFormGen
   code .
   ```

### Option 2: Download as ZIP

1. Go to the repository page: [DutyLeaveFormGen](https://github.com/mishalshanavas/DutyLeaveFormGen)
2. Click on the green **"Code"** button and select **"Download ZIP"**
3. Extract the ZIP file to a location of your choice
4. Open the extracted folder in **VS Code** or any editor

---

## 🌐 Load the Extension in Chrome(works in all browsers)

1. Open Google Chrome
2. Go to `chrome://extensions/`
3. Enable **Developer Mode** (top right corner)
4. Click **"Load unpacked"**
5. Select the folder where your extension files are located (`DutyLeaveFormGen`)
6. The extension should now appear in your extensions bar with the icon

---

## 🧩 Features

- Input student and event details
- Dropdowns for semester, branch, batch, and month
- Table for selecting absent periods
- Generate a preview or download the form as a PDF

---

## 📁 Project Structure

```bash
DutyLeaveFormGen/
├── popup.html          # Extension UI
├── popup.js            # Logic for form handling and PDF
├── manifest.json       # Chrome extension configuration
├── icon.png            # Extension icon
├── lib/
│   ├── pdf-lib.min.js
│   └── fontkit.umd.min.js
└── DutyLeaveForm.pdf   # Template PDF used for generation
```

---



## 🤝 Contributing

Collaborators: [@mishalshanavas](https://github.com/mishalshanavas) and [@shayen71421](https://github.com/shayen71421) 

Feel free to fork, submit PRs, or suggest improvements.

---

## 📃 License

This project is licensed under the MIT License.

