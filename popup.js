document.getElementById("selectAll").addEventListener("click", () => {
    const checkboxes = document.querySelectorAll("input[name='absent[]']");
    checkboxes.forEach(cb => cb.checked = true);
});

function extractAttendance() {
    const table = document.querySelector("#itsthetable");
    if (!table) return [];

    const rows = table.querySelectorAll("tbody tr");
    const data = [];

    rows.forEach(row => {
        const dateCell = row.querySelector("th");
        const day = dateCell?.innerText.trim() || "Unknown Day";

        // if holidayy add the day and skip processing its periodz.
        if (row.querySelector("td.holiday")) {
            data.push({ day, status: "Holiday" });
            return;
        }

        const periods = [];
        row.querySelectorAll("td").forEach((td, index) => {
            const status = td.classList.contains("present")
                ? "Present"
                : td.classList.contains("absent")
                ? "Absent"
                : td.classList.contains("dutyleave")
                ? "Duty Leave"
                : "Unknown";

            const subject = td.querySelector("a")?.childNodes[0]?.textContent.trim() || "";
            const tooltip = td.querySelector("span")?.textContent.trim() || "";

            periods.push({ status, subject, tooltip, period: index + 1 });
        });

        data.push({ day, periods });
    });

    return data;
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) {
        console.error("No active tabs found");
        return;
    }
    chrome.scripting.executeScript(
        {
            target: { tabId: tabs[0].id },
            func: extractAttendance
        },
        (results) => {
            const output = document.getElementById("output");
            if (chrome.runtime.lastError) {
                console.error("Script execution error:", chrome.runtime.lastError);
                output.innerHTML = "<tr><td colspan='4'>Error fetching attendance data. <a href=\"https://sahrdaya.etlab.in/ktuacademics/student/attendance\">Go to etlab</a> </td></tr>";
                return;
            }
            

            const data = results && results[0]?.result ? results[0].result : [];
            output.innerHTML = "";

            if (data.length === 0) {
                output.innerHTML = "<tr><td colspan='4'>No attendance data found.</td></tr>";
                return;
            }

            const header = document.createElement("tr");
            header.innerHTML = "<th>Select</th><th>Day</th><th>Period</th><th>Subject</th>";
            output.appendChild(header);

            let anyAbsent = false;

            data.forEach(entry => {
                if (entry.periods) {
                    entry.periods.forEach(p => {
                        if (p.status === "Absent") {
                            anyAbsent = true;
                            const row = document.createElement("tr");

                            const checkbox = document.createElement("input");
                            checkbox.type = "checkbox";
                            checkbox.name = "absent[]";
                            checkbox.value = `${entry.day} - Period ${p.period} - ${p.subject}`;

                            const cbCell = document.createElement("td");
                            cbCell.appendChild(checkbox);

                            row.appendChild(cbCell);
                            row.innerHTML += `<td>${entry.day}</td><td>${p.period}</td><td>${p.subject}</td>`;
                            output.appendChild(row);
                        }
                    });
                }
            });

            if (!anyAbsent) {
                output.innerHTML = "<tr><td colspan='4'>No absent periods found.</td></tr>";
            }
        }
    );
});

document.getElementById("absentForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const checkboxes = document.querySelectorAll("input[name='absent[]']:checked");
    const program = document.getElementById('program').value.trim();
    const studentName = document.getElementById('name').value.trim();
    const rollNo = document.getElementById('rollNo').value.trim();
    const srNo = document.getElementById('srNo').value.trim();
    const semester = document.getElementById('semester').value.trim();
    const branch = document.getElementById('branch').value.trim();
    const batch = document.getElementById('batch').value.trim();
    const month = document.getElementById('month').value.trim();

    if (checkboxes.length === 0) {
        alert("No absent periods selected. Are you trying to apply for duty leave via telepathy? Select at least one period and try again!");
    } else {
        const selected = Array.from(checkboxes).map(cb => cb.value);
        const grouped = {};
        selected.forEach(value => {
            const parts = value.split(" - ");
            if (parts.length >= 2) {
                const day = parts[0].trim();
                const periodStr = parts[1].trim();
                const periodMatch = periodStr.match(/\d+/);
                if (periodMatch) {
                    const period = periodMatch[0];
                    if (!grouped[day]) grouped[day] = [];
                    grouped[day].push(period);
                }
            }
        });

        const alertLines = [];
        for (const day in grouped) {
            const periods = grouped[day].join(", ");
            alertLines.push(`${day} ${month}: ${periods}`);
        }
        alert("Requesting duty leave for:\n" + alertLines.join("\n"));
    }
});

document.getElementById("downloadPdfBtn").addEventListener("click", async () => {

  const program = document.getElementById('program').value.trim();
    const studentName = document.getElementById('name').value.trim();
    const rollNo = document.getElementById('rollNo').value.trim();
    const srNo = document.getElementById('srNo').value.trim();
    const semester = document.getElementById('semester').value.trim();
    const branch = document.getElementById('branch').value.trim();
    const batch = document.getElementById('batch').value.trim();
    const month = document.getElementById('month').value.trim();

    try {
        await fillAndPreviewPdf();
    } catch (error) {
        console.error("Error filling PDF:", error);
        alert("Error filling PDF: " + error.message);
    }
});

async function fillAndPreviewPdf() {
    try {
        const existingPdfBytes = await fetchPdfAsBytes('DutyLeaveForm.pdf');
        const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
        const [firstPage] = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
        const obliqueFont = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaOblique);
        const { width, height } = firstPage.getSize();

        // Get values
        const program = document.getElementById('program').value;
        const studentName = document.getElementById('name').value;
        const rollNo = document.getElementById('rollNo').value;
        const srNo = document.getElementById('srNo').value;
        const semester = document.getElementById('semester').value;
        const branch = document.getElementById('branch').value;
        const batch = document.getElementById('batch').value;
        const month = document.getElementById('month').value;
        firstPage.drawText(program, { x: 80, y: height - 114, size: 14, font: obliqueFont });
        firstPage.drawText(studentName, { x: 88, y: height - 142, size: 14, font });
        firstPage.drawText(rollNo, { x: 339, y: height - 142, size: 14, font });
        firstPage.drawText(srNo, { x: 454, y: height - 142, size: 14, font });
        firstPage.drawText(semester, { x: 100, y: height - 166, size: 14, font });
        firstPage.drawText(branch, { x: 230, y: height - 166, size: 14, font });
        firstPage.drawText(batch, { x: 330, y: height - 166, size: 14, font });
        const checkboxes = document.querySelectorAll("input[name='absent[]']:checked");
        
        if (checkboxes.length === 0) {
          alert("No absent periods selected. Select at least one period.");
        } else {
          const selected = Array.from(checkboxes).map(cb => cb.value);
          const grouped = {};
          selected.forEach(value => {
              const parts = value.split(" - ");
              if (parts.length >= 2) {
                  const day = parts[0].trim();
                  const periodStr = parts[1].trim();
                  const periodMatch = periodStr.match(/\d+/);
                  if (periodMatch) {
                      const period = periodMatch[0];
                      if (!grouped[day]) grouped[day] = [];
                      grouped[day].push(period);
                  }
              }
          });
  
          const alertLines = [];
          for (const day in grouped) {                                            // 
              const paddedDay = day.padEnd(4, ' ');                               //no idea
              const periods = grouped[day].join(", ");                            //but it works
              alertLines.push(`${paddedDay} ${month}             ${periods}`);
          }
            let ypos = height - 222;
            const lineSpacing = 23; // line spacing
            alertLines.forEach(line => {
              firstPage.drawText(line, { x: 60, y: ypos, size: 12, font });
              ypos -= lineSpacing;
            });
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' }); 
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please check console for details.');
        throw error;
    }
}

// Fetch PDF as byte array
async function fetchPdfAsBytes(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.arrayBuffer();
    } catch (error) {
        console.error('Error fetching PDF:', error);
        alert('Could not fetch the PDF form. Please ensure the form is available at the correct path.');
        throw error;
    }
}