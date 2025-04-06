document.getElementById("selectAll").addEventListener("click", () => {
    const checkboxes = document.querySelectorAll("input[name='absent[]']");
    checkboxes.forEach((cb) => {
      cb.checked = true;
    });
  });
  
function extractAttendance() {
    const table = document.querySelector("#itsthetable");
    if (!table) return [];
  
    const rows = table.querySelectorAll("tbody tr");
    const data = [];
  
    rows.forEach((row) => {
      const dateCell = row.querySelector("th");
      const day = dateCell?.innerText.trim() || "Unknown Day";
  
      const isHoliday = row.querySelector("td.holiday");
      if (isHoliday) {
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
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        func: extractAttendance
      },
      (results) => {
        const output = document.getElementById("output");
        const data = results[0]?.result || [];
  
        output.innerHTML = "";
        const header = document.createElement("tr");
        header.innerHTML = "<th>Select</th><th>Day</th><th>Period</th><th>Subject</th>";
        output.appendChild(header);
  
        let anyAbsent = false;
  
        data.forEach((entry) => {
          if (entry.periods) {
            entry.periods.forEach((p) => {
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
  
  document.getElementById("absentForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const checkboxes = document.querySelectorAll("input[name='absent[]']:checked");
  
    if (checkboxes.length === 0) {
      alert("No absent periods selected u dumb!");
    } else {
      const selected = Array.from(checkboxes).map((cb) => cb.value);
      const grouped = {};
      selected.forEach((value) => {
          // "xx jjj - 1 <sub>"
          const parts = value.split(" - ");
          if (parts.length >= 2) {
              const day = parts[0].trim();
              const periodStr = parts[1].trim();  
              const periodMatch = periodStr.match(/\d+/);
              if (periodMatch) {
                  const period = periodMatch[0];
                  if (!grouped[day]) {
                      grouped[day] = [];
                  }
                  grouped[day].push(period);
              }
          }
      });
      
      const alertLines = [];
      for (const day in grouped) {
          const periods = grouped[day].join(",");
          alertLines.push(`${day} : ${periods}`);
      }
      
      alert("Requesting duty leave for:\n" + alertLines.join("\n"));
      // Extend here: send to server, fill form, generate PDF etc.
    }
});
