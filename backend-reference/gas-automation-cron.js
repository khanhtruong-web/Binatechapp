// This script should be attached to the Master Google Sheet via Extensions -> Apps Script

function checkExpirationsAndSendAlerts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const rules = [
    { sheetName: 'Equipment', dateColIndex: 5, entityNameColIndex: 1, type: 'Equipment Calibration', daysWarning: 30 },
    { sheetName: 'HR (Personnel)', dateColIndex: 5, entityNameColIndex: 1, type: 'NDT Certification', daysWarning: 60 },
    { sheetName: 'HR (Personnel)', dateColIndex: 6, entityNameColIndex: 1, type: 'Medical/Vision', daysWarning: 30 },
    { sheetName: 'HR (Personnel)', dateColIndex: 7, entityNameColIndex: 1, type: 'Employment Contract', daysWarning: 30 },
    { sheetName: 'Tender Dossier', dateColIndex: 2, entityNameColIndex: 0, type: 'Tender Deadline', daysWarning: 15 }
  ];

  const alerts = [];
  const today = new Date();
  today.setHours(0,0,0,0);

  rules.forEach(rule => {
    const sheet = ss.getSheetByName(rule.sheetName);
    if (!sheet) return;
    
    // Assuming row 1 is headers
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const targetDate = new Date(row[rule.dateColIndex]);
      const entityName = row[rule.entityNameColIndex];
      
      if (Object.prototype.toString.call(targetDate) === "[object Date]" && !isNaN(targetDate)) {
        const timeDiff = targetDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        if (daysDiff > 0 && daysDiff <= rule.daysWarning) {
          alerts.push(`<li><b>${rule.type}</b> for ${entityName} is expiring in <b>${daysDiff} days</b> (${targetDate.toLocaleDateString()}).</li>`);
        } else if (daysDiff <= 0) {
          alerts.push(`<li><span style="color:red"><b>EXPIRED:</b> ${rule.type} for ${entityName} expired ${Math.abs(daysDiff)} days ago.</span></li>`);
        }
      }
    }
  });

  if (alerts.length > 0) {
    sendEmailAlert(alerts);
  }
}

function sendEmailAlert(alertsList) {
  // Replace with admin emails
  const recipient = "admin@binatech-ndt.com"; 
  const subject = "⚠️ Binatech ERP: Automated Expiry Alerts";
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #1e3a8a;">Binatech ERP - Automated System Alerts</h2>
      <p>The following items require immediate attention:</p>
      <ul>
        ${alertsList.join('')}
      </ul>
      <br/>
      <p><a href="${SpreadsheetApp.getActiveSpreadsheet().getUrl()}" style="padding: 10px 15px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Open Master Dashboard</a></p>
    </div>
  `;

  GmailApp.sendEmail(recipient, subject, "", { htmlBody: htmlBody });
}

// To set up the Cron Job:
// 1. In Apps Script, go to "Triggers" (Clock icon on left menu)
// 2. Click "Add Trigger"
// 3. Choose which function to run: checkExpirationsAndSendAlerts
// 4. Select event source: Time-driven
// 5. Select type of time based trigger: Day timer
// 6. Select time of day: e.g., 6am to 7am
