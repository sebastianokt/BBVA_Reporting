const SHEET_PROCESOS = "Hoja 1";
const SHEET_COMENTARIOS = "Comentarios";
const SHEET_FREDY = "Fredy";
const HEADER_ID = "ID_PROCESO";
const HEADER_COMMENTS = "Comentarios";
const HEADER_DATE = "Fecha";
const HEADER_USER = "Usuario";
const HEADER_STATUS = "Estado";
const HEADER_STATUS_DATE = "Fecha_estado";
const HEADER_DONE = "Ya migrado";
const HEADER_IN_PROCESS = "En proceso";
const HEADER_VALIDATING = "Validando";

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

const findColumnByContains = (sheet, fragment) => {
  const needle = normalize(fragment);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const index = headers.findIndex((header) => normalize(header).includes(needle));
  return index === -1 ? null : index + 1;
};

const ensureCommentsSheet = (spreadsheet) => {
  let sheet = spreadsheet.getSheetByName(SHEET_COMENTARIOS);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_COMENTARIOS);
    sheet.getRange(1, 1, 1, 4).setValues([[HEADER_ID, HEADER_COMMENTS, HEADER_DATE, HEADER_USER]]);
  }
  return sheet;
};

const findProcessRow = (spreadsheet, processId) => {
  const sheet = spreadsheet.getSheetByName(SHEET_PROCESOS);
  if (!sheet) return null;
  const headerMap = getHeaderMap(sheet);
  const idColumn = headerMap[normalize(HEADER_ID)] || headerMap[normalize("ID Proceso")];
  if (!idColumn) return null;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const ids = sheet.getRange(2, idColumn, lastRow - 1, 1).getValues().flat();
  const index = ids.findIndex((id) => String(id || "").trim() === processId);
  return index === -1 ? null : { sheet, row: index + 2, idColumn };
};

const findRowById = (spreadsheet, sheetName, processId) => {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) return null;
  const headerMap = getHeaderMap(sheet);
  const idColumn = headerMap[normalize(HEADER_ID)] || headerMap[normalize("ID Proceso")];
  if (!idColumn) return null;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const ids = sheet.getRange(2, idColumn, lastRow - 1, 1).getValues().flat();
  const index = ids.findIndex((id) => String(id || "").trim() === processId);
  return index === -1 ? null : { sheet, row: index + 2, idColumn, headerMap };
};

const processExists = (spreadsheet, processId) => {
  return Boolean(findProcessRow(spreadsheet, processId));
};

const findCommentRow = (sheet, processId, idColumn) => {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const ids = sheet.getRange(2, idColumn, lastRow - 1, 1).getValues().flat();
  const index = ids.findIndex((id) => String(id || "").trim() === processId);
  return index === -1 ? -1 : index + 2;
};

const getStatusColumns = (sheet) => {
  return {
    done: findColumnByContains(sheet, HEADER_DONE),
    inProcess: findColumnByContains(sheet, HEADER_IN_PROCESS),
    validating: findColumnByContains(sheet, HEADER_VALIDATING),
  };
};

const applyStatus = (sheet, row, status) => {
  const columns = getStatusColumns(sheet);
  if (!columns.done || !columns.inProcess || !columns.validating) {
    throw new Error("No se encontraron columnas Ya migrado, En proceso y Validando");
  }

  sheet.getRange(row, columns.done).clearContent();
  sheet.getRange(row, columns.inProcess).clearContent();
  sheet.getRange(row, columns.validating).clearContent();

  const normalizedStatus = normalize(status);
  if (normalizedStatus === normalize("Ya se migro") || normalizedStatus === normalize("Ya se migró")) {
    sheet.getRange(row, columns.done).setValue("ya");
  } else if (normalizedStatus === normalize("En proceso")) {
    sheet.getRange(row, columns.inProcess).setValue(1);
  } else if (normalizedStatus === normalize("Validando")) {
    sheet.getRange(row, columns.validating).setValue(1);
  }
};

const saveComment = (spreadsheet, payload) => {
  try {
    const processId = String(payload.processId || "").trim();
    const comments = String(payload.comments || "");
    const userName = String(payload.userName || "local");
    const updatedAt = payload.updatedAt || new Date().toISOString();

    if (!processId) return jsonResponse({ ok: false, error: "ID_PROCESO requerido" });

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
};

const saveStatus = (spreadsheet, payload) => {
  try {
    const processId = String(payload.processId || "").trim();
    const status = String(payload.status || "Falta migrar");
    const statusScope = String(payload.statusScope || "migration");
    const userName = String(payload.userName || "local");
    const updatedAt = payload.updatedAt || new Date().toISOString();

    if (!processId) return jsonResponse({ ok: false, error: "ID_PROCESO requerido" });

    if (statusScope === "fredy") {
      const match = findRowById(spreadsheet, SHEET_FREDY, processId);
      if (!match) {
        return jsonResponse({ ok: false, error: "ID_PROCESO no existe en Fredy" });
      }
      const statusColumn = match.headerMap[normalize(HEADER_STATUS)];
      if (!statusColumn) {
        return jsonResponse({ ok: false, error: "No se encontro columna Estado en Fredy" });
      }
      match.sheet.getRange(match.row, statusColumn).setValue(status);
      return jsonResponse({
        ok: true,
        process: { processId, status, statusScope, updatedAt, userName },
      });
    }

    const match = findProcessRow(spreadsheet, processId);
    if (!match) {
      return jsonResponse({ ok: false, error: "ID_PROCESO no existe en Hoja 1" });
    }

    applyStatus(match.sheet, match.row, status);

    return jsonResponse({
      ok: true,
      process: { processId, status, updatedAt, userName },
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
};

const saveFredyDate = (spreadsheet, payload) => {
  try {
    const processId = String(payload.processId || payload.fredyProcessId || "").trim();
    const statusDate = String(payload.statusDate || "").trim();
    const userName = String(payload.userName || "local");
    const updatedAt = payload.updatedAt || new Date().toISOString();

    if (!processId) return jsonResponse({ ok: false, error: "ID_PROCESO requerido" });

    const match = findRowById(spreadsheet, SHEET_FREDY, processId);
    if (!match) {
      return jsonResponse({ ok: false, error: "ID_PROCESO no existe en Fredy" });
    }
    const dateColumn = match.headerMap[normalize(HEADER_STATUS_DATE)];
    if (!dateColumn) {
      return jsonResponse({ ok: false, error: "No se encontro columna Fecha_estado en Fredy" });
    }

    match.sheet.getRange(match.row, dateColumn).setValue(statusDate);
    return jsonResponse({
      ok: true,
      process: { processId, statusDate, updatedAt, userName },
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
};

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || "{}");
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (payload.action === "status") return saveStatus(spreadsheet, payload);
    if (payload.action === "fredy_date") return saveFredyDate(spreadsheet, payload);
    if (!payload.action || payload.action === "comment") return saveComment(spreadsheet, payload);
    return jsonResponse({ ok: false, error: `Accion no soportada: ${payload.action}` });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
}
