const SHEET_PROCESOS = "Hoja 1";
const SHEET_COMENTARIOS = "Comentarios";
const HEADER_ID = "ID_PROCESO";
const HEADER_COMMENTS = "Comentarios";
const HEADER_DATE = "Fecha";
const HEADER_USER = "Usuario";

const jsonResponse = (payload) => {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
};

const normalize = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const getHeaderMap = (sheet) => {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.reduce((map, header, index) => {
    map[normalize(header)] = index + 1;
    return map;
  }, {});
};

const ensureCommentsSheet = (spreadsheet) => {
  let sheet = spreadsheet.getSheetByName(SHEET_COMENTARIOS);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_COMENTARIOS);
    sheet.getRange(1, 1, 1, 4).setValues([[HEADER_ID, HEADER_COMMENTS, HEADER_DATE, HEADER_USER]]);
  }
  return sheet;
};

const processExists = (spreadsheet, processId) => {
  const sheet = spreadsheet.getSheetByName(SHEET_PROCESOS);
  if (!sheet) return false;
  const headerMap = getHeaderMap(sheet);
  const idColumn = headerMap[normalize(HEADER_ID)] || headerMap[normalize("ID Proceso")];
  if (!idColumn) return false;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  const ids = sheet.getRange(2, idColumn, lastRow - 1, 1).getValues().flat();
  return ids.some((id) => String(id || "").trim() === processId);
};

const findCommentRow = (sheet, processId, idColumn) => {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const ids = sheet.getRange(2, idColumn, lastRow - 1, 1).getValues().flat();
  const index = ids.findIndex((id) => String(id || "").trim() === processId);
  return index === -1 ? -1 : index + 2;
};

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || "{}");
    const processId = String(payload.processId || "").trim();
    const comments = String(payload.comments || "");
    const userName = String(payload.userName || "local");
    const updatedAt = payload.updatedAt || new Date().toISOString();

    if (!processId) return jsonResponse({ ok: false, error: "ID_PROCESO requerido" });

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!processExists(spreadsheet, processId)) {
      return jsonResponse({ ok: false, error: "ID_PROCESO no existe en Hoja 1" });
    }

    const sheet = ensureCommentsSheet(spreadsheet);
    const headerMap = getHeaderMap(sheet);
    const idColumn = headerMap[normalize(HEADER_ID)];
    const commentsColumn = headerMap[normalize(HEADER_COMMENTS)];
    const dateColumn = headerMap[normalize(HEADER_DATE)];
    const userColumn = headerMap[normalize(HEADER_USER)];
    const existingRow = findCommentRow(sheet, processId, idColumn);
    const targetRow = existingRow === -1 ? sheet.getLastRow() + 1 : existingRow;

    sheet.getRange(targetRow, idColumn).setValue(processId);
    sheet.getRange(targetRow, commentsColumn).setValue(comments);
    sheet.getRange(targetRow, dateColumn).setValue(updatedAt);
    sheet.getRange(targetRow, userColumn).setValue(userName);

    return jsonResponse({
      ok: true,
      comment: { processId, comments, updatedAt, userName },
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
}
