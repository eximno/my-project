
const SHEET_ID = '12wFT-ICdKB9CPQ-OOAHRywCeBVxluQkvlxogwkkEFvg';
const SHEET_NAME = 'Students'; 

function getSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  return sheet;
}

// Make sure the header row exists
function setupSheet() {
  const sheet = getSheet();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['ID', 'Name', 'Course']);
  }
}

// ---------- READ ----------
// GET request -> returns all records as JSON
function doGet(e) {
  setupSheet();
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1); 

  const records = rows
    .filter(row => row[0] !== '')
    .map(row => ({
      id: row[0],
      name: row[1],
      course: row[2]
    }));

  return jsonResponse({ status: 'success', data: records });
}

// ---------- CREATE / UPDATE / DELETE ----------
// POST request -> action=create|update|delete
function doPost(e) {
  setupSheet();
  const action = e.parameter.action;

  try {
    switch (action) {
      case 'create':
        return createRecord(e.parameter.name, e.parameter.course);
      case 'update':
        return updateRecord(e.parameter.id, e.parameter.name, e.parameter.course);
      case 'delete':
        return deleteRecord(e.parameter.id);
      default:
        return jsonResponse({ status: 'error', message: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.message });
  }
}

function createRecord(name, course) {
  if (!name || !course) {
    return jsonResponse({ status: 'error', message: 'Name and course are required.' });
  }
  const sheet = getSheet();
  const newId = Utilities.getUuid();
  sheet.appendRow([newId, name, course]);
  return jsonResponse({ status: 'success', message: 'Record added.', id: newId });
}

function updateRecord(id, name, course) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.getRange(i + 1, 2).setValue(name);
      sheet.getRange(i + 1, 3).setValue(course);
      return jsonResponse({ status: 'success', message: 'Record updated.' });
    }
  }
  return jsonResponse({ status: 'error', message: 'Record not found.' });
}

function deleteRecord(id) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ status: 'success', message: 'Record deleted.' });
    }
  }
  return jsonResponse({ status: 'error', message: 'Record not found.' });
}

// ---------- HELPER ----------
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
