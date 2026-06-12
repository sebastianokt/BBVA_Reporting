import {
  API_BASE_URL,
  HISTORY_STORAGE_KEY,
  IMPORT_STORAGE_KEY,
  STATUS_STORAGE_KEY,
  VALIDATION_STORAGE_KEY,
} from "../config/constants.js";

export const loadStatusMap = () => {
  try {
    const raw = localStorage.getItem(STATUS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
};

export const saveStatusMap = (statusMap) => {
  localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(statusMap));
};

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
};

const writeJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const shouldUseApi = () => {
  if (typeof window === "undefined") return false;
  if (window.location.hostname.endsWith("github.io")) return false;
  if (["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return ["8000", "8010"].includes(window.location.port);
  }
  return false;
};

const apiRequest = async (path, options = {}) => {
  if (!shouldUseApi()) return null;
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!response.ok) throw new Error(`API ${response.status}`);
    return response.json();
  } catch (error) {
    return null;
  }
};

export const loadHistoryEvents = async () => {
  const apiData = await apiRequest("/history");
  if (apiData?.events) return apiData.events;
  return readJson(HISTORY_STORAGE_KEY, []);
};

export const appendHistoryEvent = async (event) => {
  const payload = {
    entityType: event.entityType || "process",
    entityId: event.entityId || "",
    eventType: event.eventType || "change",
    fieldName: event.fieldName || "",
    oldValue: event.oldValue ?? "",
    newValue: event.newValue ?? "",
    source: event.source || "dashboard",
    userName: event.userName || "local",
    createdAt: event.createdAt || new Date().toISOString(),
  };

  const apiData = await apiRequest("/history", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (apiData?.event) return apiData.event;

  const events = readJson(HISTORY_STORAGE_KEY, []);
  const saved = { id: Date.now(), ...payload };
  events.unshift(saved);
  writeJson(HISTORY_STORAGE_KEY, events.slice(0, 500));
  return saved;
};

export const recordImportSnapshot = async ({ fileName, processes = [], scheduleEntries = [], warnings = [] }) => {
  const payload = {
    fileName,
    importedBy: localStorage.getItem("dashboard-user") || "local",
    notes: warnings.join(" | "),
    processCount: processes.length,
    scheduleCount: scheduleEntries.length,
    snapshot: {
      processes: processes.map((process) => ({
        idProceso: process.processId,
        tipoProceso: process.processType || process.team,
        nombreProceso: process.name,
        estadoActual: process.migrationStatus,
        personaActual: process.personaCronograma || process.assignedTo,
        semanaPlanificada: process.semanaPlanificada || null,
      })),
      scheduleEntries: scheduleEntries.map((entry) => ({
        idProceso: entry.processId,
        semana: entry.week,
        persona: entry.person,
        actividad: entry.processName,
      })),
    },
  };

  const apiData = await apiRequest("/imports", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (apiData?.import) return apiData.import;

  const imports = readJson(IMPORT_STORAGE_KEY, []);
  const saved = {
    id: Date.now(),
    fileName,
    importedBy: payload.importedBy,
    notes: payload.notes,
    processCount: processes.length,
    scheduleCount: scheduleEntries.length,
    importedAt: new Date().toISOString(),
  };
  imports.unshift(saved);
  writeJson(IMPORT_STORAGE_KEY, imports.slice(0, 100));
  await appendHistoryEvent({
    entityType: "import",
    entityId: String(saved.id),
    eventType: "import",
    fieldName: "file",
    oldValue: "",
    newValue: `${fileName}: ${processes.length} procesos, ${scheduleEntries.length} cronograma`,
    source: "excel",
    userName: saved.importedBy,
  });
  return saved;
};

export const loadValidationRuns = async () => {
  const apiData = await apiRequest("/validations");
  if (apiData?.runs) return apiData.runs;
  return readJson(VALIDATION_STORAGE_KEY, []);
};

export const recordValidationRun = async (run) => {
  const payload = {
    validationName: run.validationName,
    status: run.status,
    summary: run.summary,
    executedBy: run.executedBy || "local",
    results: run.results || [],
  };
  const apiData = await apiRequest("/validations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (apiData?.run) return apiData.run;

  const runs = readJson(VALIDATION_STORAGE_KEY, []);
  const saved = {
    id: Date.now(),
    ...payload,
    executedAt: new Date().toISOString(),
  };
  runs.unshift(saved);
  writeJson(VALIDATION_STORAGE_KEY, runs.slice(0, 100));
  return saved;
};
