# Google Apps Script Setup Guide

To sync your ClipStaff PRO extension with a Google Sheet, you need to deploy a Google Apps Script that serves as the sync API. Follow these steps to configure your Sheet and deploy the script.

---

## 🛠️ Step-by-Step Setup

1. **Open Google Sheets**: Create a new or open an existing Google Sheet.
2. **Access Apps Script Editor**:
   * Click **Extensions** in the top menu bar.
   * Click **Apps Script**.
3. **Paste the Script**:
   * Delete any default code inside the editor.
   * Copy the code from the **Google Apps Script Code** section below.
   * Paste it into the editor.
   * Click the **Save** icon (floppy disk) or press `Ctrl + S`.
4. **Deploy as a Web App**:
   * Click the **Deploy** button in the top right.
   * Select **New deployment**.
   * Click the **Gear icon** next to "Select type" and choose **Web app**.
   * Configure the settings exactly as follows:
     * **Description**: `ClipStaff Sync API`
     * **Execute as**: `Me (your-email@gmail.com)`
     * **Who has access**: `Anyone` *(Crucial: Set this to "Anyone", otherwise the extension cannot access it).*
   * Click **Deploy**.
5. **Authorize Permissions**:
   * Click **Authorize Access** and select your Google Account.
   * Click **Advanced** on the warnings screen, then click **Go to Untitled project (unsafe)**.
   * Click **Allow** to grant spreadsheet edit permissions.
6. **Copy Web App URL**:
   * Copy the generated **Web App URL** (ends in `/exec`).
7. **Configure in Extension**:
   * Open the ClipStaff PRO sidebar.
   * Click the **Google Sheet Refresh** view tab.
   * Click **Settings** to reveal the configurations.
   * Paste your copied Apps Script Web App URL into the **Google Web App URL** input field.

---

## 📄 Google Apps Script Code

Copy and paste the following code into your Google Apps Script editor:

```javascript
// =========================================================================
// CONFIGURATION (ONLY needed if script is NOT container-bound)
// If you created this script via script.google.com (standalone), paste your Spreadsheet ID below.
// If you created this script via Extensions > Apps Script inside your sheet, leave it empty.
var SPREADSHEET_ID = ""; 
// =========================================================================

var SCRIPT_VERSION = 1.1;

// Helper to open spreadsheet (handles both container-bound and standalone setups)
function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim().length > 0) {
    return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  }
  
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  
  throw new Error("Spreadsheet not found! If this is a standalone script (created at script.google.com), you MUST configure the SPREADSHEET_ID at the top of the script.");
}

// GET Request Handler
function doGet(e) {
  var action = e.parameter.action;
  
  if (action === "get_version") {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      version: getSheetVersion()
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === "get_jobs") {
    try {
      var jobs = getAllJobsFromSheets();
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        version: getSheetVersion(),
        jobs: jobs
      })).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: err.toString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: "Unknown action parameter"
  })).setMimeType(ContentService.MimeType.JSON);
}

// POST Request Handler
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || "batch_upload"; // Default to batch_upload if missing
    
    if (action === "batch_upload") {
      var profileName = data.profileName || "Default_Profile";
      var jobs = data.jobs || [];
      
      var result = batchUploadJobs(profileName, jobs);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        addedCount: result.addedCount,
        version: result.version
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: "Unsupported POST action: " + action
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Get spreadsheet version (stored in DocumentProperties)
function getSheetVersion() {
  var properties = PropertiesService.getDocumentProperties();
  var ver = properties.getProperty("SHEET_VERSION");
  if (!ver) {
    ver = "1";
    properties.setProperty("SHEET_VERSION", ver);
  }
  return parseInt(ver, 10);
}

// Increment sheet version
function incrementSheetVersion() {
  var properties = PropertiesService.getDocumentProperties();
  var ver = getSheetVersion() + 1;
  properties.setProperty("SHEET_VERSION", ver.toString());
  
  // Also write to a __meta__ sheet for local backups
  try {
    var ss = getSpreadsheet();
    var metaSheet = ss.getSheetByName("__meta__");
    if (!metaSheet) {
      metaSheet = ss.insertSheet("__meta__");
      metaSheet.hideSheet();
    }
    metaSheet.getRange("A1").setValue("1.0.0");
    metaSheet.getRange("B1").setValue(ver);
  } catch (e) {
    Logger.log("Failed to update __meta__ sheet: " + e.toString());
  }
  return ver;
}

// Retrieve all jobs across all sheets/tabs
function getAllJobsFromSheets() {
  var ss = getSpreadsheet();
  var sheets = ss.getSheets();
  var allJobs = [];
  
  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    if (sheet.isSheetHidden() || sheet.getName() === "__meta__") continue;
    
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) continue; // Header or empty
    
    var values = sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues();
    var headers = values[0].map(function(h) { return String(h).toLowerCase().trim(); });
    
    var companyIdx = headers.indexOf("company");
    var roleIdx = headers.indexOf("role");
    var urlIdx = headers.indexOf("url");
    var statusIdx = headers.indexOf("status");
    var dateIdx = headers.indexOf("date added");
    
    if (companyIdx === -1 || roleIdx === -1 || urlIdx === -1 || statusIdx === -1) {
      continue;
    }
    
    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      var urlVal = String(row[urlIdx]).trim();
      if (!urlVal) continue;
      
      allJobs.push({
        id: "sheet-" + sheet.getName() + "-" + r,
        company: String(row[companyIdx]).trim(),
        role: String(row[roleIdx]).trim(),
        url: urlVal,
        status: String(row[statusIdx]).trim().toLowerCase().replace(/\s+/g, '_') || "not_applied",
        dateAdded: dateIdx !== -1 ? String(row[dateIdx]).trim() : ""
      });
    }
  }
  return allJobs;
}

// Perform merge/upload of jobs
function batchUploadJobs(profileName, jobs) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(profileName);
  
  if (!sheet) {
    sheet = ss.insertSheet(profileName);
    var headers = ['S.No.', 'Company', 'Role', 'URL', 'Status', 'Date Added'];
    sheet.appendRow(headers);
    
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#1E293B"); // Slate-800
    headerRange.setFontColor("#FFFFFF");
    headerRange.setHorizontalAlignment("center");
    sheet.setColumnWidth(1, 50); // Set S.No column to be narrow (small width)
  }
  
  var lastRow = sheet.getLastRow();
  var dataRange = sheet.getRange(1, 1, lastRow === 0 ? 1 : lastRow, sheet.getLastColumn());
  var values = dataRange.getValues();
  var headers = values[0].map(function(h) { return String(h).toLowerCase().trim(); });
  
  var companyIdx = headers.indexOf("company");
  var roleIdx = headers.indexOf("role");
  var urlIdx = headers.indexOf("url");
  var statusIdx = headers.indexOf("status");
  var dateIdx = headers.indexOf("date added");
  
  if (companyIdx === -1 || roleIdx === -1 || urlIdx === -1 || statusIdx === -1) {
    throw new Error("Target worksheet '" + profileName + "' lacks required headers.");
  }
  
  // Index existing URLs in this tab
  var urlToRowMap = {};
  for (var r = 1; r < values.length; r++) {
    var urlVal = String(values[r][urlIdx]).trim().toLowerCase();
    if (urlVal) {
      urlToRowMap[urlVal] = r + 1;
    }
  }
  
  var addedCount = 0;
  
  for (var i = 0; i < jobs.length; i++) {
    var job = jobs[i];
    var normUrl = String(job.url).trim().toLowerCase();
    if (!normUrl) continue;
    
    var existingRowNumber = urlToRowMap[normUrl];
    
    if (existingRowNumber) {
      var currentStatus = String(sheet.getRange(existingRowNumber, statusIdx + 1).getValue()).trim().toLowerCase().replace(/\s+/g, '_');
      var newStatus = String(job.status || "not_applied").trim().toLowerCase().replace(/\s+/g, '_');
      
      if (currentStatus !== newStatus) {
        sheet.getRange(existingRowNumber, statusIdx + 1).setValue(newStatus === 'applied' ? 'Applied' : (newStatus === 'skipped' ? 'Skipped' : 'To Apply'));
      }
    } else {
      var nextSNo = sheet.getLastRow();
      var newRow = [];
      newRow[0] = nextSNo;
      newRow[companyIdx] = job.company;
      newRow[roleIdx] = job.role;
      newRow[urlIdx] = job.url;
      newRow[statusIdx] = job.status === 'applied' ? 'Applied' : (job.status === 'skipped' ? 'Skipped' : 'To Apply');
      newRow[dateIdx] = job.dateAdded || new Date().toLocaleDateString('en-US');
      
      sheet.appendRow(newRow);
      addedCount++;
    }
  }
  
  // Recalculate S.No. (Column A) to ensure sequential numbering and format it as center-aligned
  var finalLastRow = sheet.getLastRow();
  if (finalLastRow > 1) {
    var snoRange = sheet.getRange(2, 1, finalLastRow - 1, 1);
    var snoValues = [];
    for (var r = 2; r <= finalLastRow; r++) {
      snoValues.push([r - 1]);
    }
    snoRange.setValues(snoValues);
    snoRange.setHorizontalAlignment("center");
  }
  sheet.setColumnWidth(1, 50); // Keep column A narrow (small width)
  
  var newVersion = incrementSheetVersion();
  return {
    addedCount: addedCount,
    version: newVersion
  };
}
```

