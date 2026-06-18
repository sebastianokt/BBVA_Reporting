import { LOCAL_EXCEL_FILE_NAME, MIGRATION_STATUS } from "../config/constants.js";
import { DEFAULT_FILE_NAME, loadFromFile, loadFromUrl } from "../data/excel-loader.js";
import { setActiveModule, setActiveTeam } from "../components/sidebar.js";
import { renderDashboard, renderEmptyState } from "../components/ui-state.js";
import { filterProcesses, filterScheduleEntries, getProcessResponsible, getScheduleProcesses, getTeamFiltered } from "../services/filters.js";
import { displayResponsible } from "../services/format.js";
import { mergeProcessComments, saveProcessComment } from "../services/comments.js";
import { saveProcessStatus } from "../services/process-status.js";
import {
  appendHistoryEvent,
  loadHistoryEvents,
  recordImportSnapshot,
} from "../services/storage.js";

const statusEl = document.getElementById("load-status");
const fileInput = document.getElementById("file-input");
const reloadButton = document.getElementById("reload-button");
const searchInput = document.getElementById("search-input");
const responsableFilter = document.getElementById("responsable-filter");
const statusFilter = document.getElementById("status-filter");
const weekFilter = document.getElementById("week-filter");
const typeFilter = document.getElementById("type-filter");
const scheduleTitle = document.getElementById("schedule-title");

const state = {
  allProcesses: [],
  scheduleEntries: [],
  fredyEntries: [],
  historyEvents: [],
  activeTeam: "ALL",
  activeModule: "overview",
  sourceFileName: DEFAULT_FILE_NAME,
};

const setStatus = (message, tone = "info") => {
  statusEl.textContent = message;
  statusEl.className = tone === "error" ? "text-danger" : "text-dark";
};

const updateWeekOptions = (scheduleEntries) => {
  if (!weekFilter) return;
  const isMonthMode = state.activeTeam === "F";
  const currentValue = weekFilter.value || "all";
  const label = document.querySelector('label[for="week-filter"]');
  if (label) label.textContent = isMonthMode ? "Mes" : "Semana";
  if (scheduleTitle) scheduleTitle.textContent = isMonthMode ? "Cronograma mensual" : "Calendario por semana";
  weekFilter.innerHTML = isMonthMode
    ? '<option value="all">Todos los meses</option>'
    : '<option value="all">Todas las semanas</option>';

  if (isMonthMode) {
    const months = Array.from(
      new Map(
        scheduleEntries
          .filter((entry) => entry.monthKey)
          .map((entry) => [entry.monthKey, entry])
      ).values()
    ).sort((a, b) => (a.monthOrder || 9999) - (b.monthOrder || 9999) || String(a.month).localeCompare(String(b.month)));
    months.forEach((entry) => {
      const option = document.createElement("option");
      option.value = entry.monthKey;
      option.textContent = entry.month || entry.monthKey;
      weekFilter.appendChild(option);
    });
    weekFilter.value = currentValue !== "all" && !months.some((entry) => entry.monthKey === currentValue) ? "all" : currentValue;
    return;
  }

  const weeks = Array.from(
    new Set(scheduleEntries.map((entry) => entry.week).filter((week) => Number.isInteger(week) && week > 0))
  ).sort((a, b) => a - b);
  weeks.forEach((week) => {
    const option = document.createElement("option");
    option.value = String(week);
    option.textContent = `Semana ${week}`;
    weekFilter.appendChild(option);
  });
  weekFilter.value = currentValue !== "all" && !weeks.includes(Number.parseInt(currentValue, 10)) ? "all" : currentValue;
};

const updateTypeOptions = (processes) => {
  if (!typeFilter) return;
  const types = Array.from(new Set(processes.map((process) => process.processType || process.team || "Sin tipo"))).sort();
  const currentValue = typeFilter.value || "all";
  typeFilter.innerHTML = '<option value="all">Todos los tipos</option>';
  types.forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = `Tipo ${type}`;
    typeFilter.appendChild(option);
  });
  typeFilter.value = currentValue !== "all" && !types.includes(currentValue) ? "all" : currentValue;
};

const relinkScheduleEntries = (scheduleEntries, processes) => {
  const processesById = new Map(
    processes
      .filter((process) => process.processId)
      .map((process) => [String(process.processId).trim(), process])
  );

  return scheduleEntries.map((entry) => {
    const processId = String(entry.processId || "").trim();
    return {
      ...entry,
      linkedProcess: processesById.get(processId) || entry.linkedProcess || null,
    };
  });
};

const updateProcessCommentState = ({ processId, comments, updatedAt, userName }) => {
  const cleanProcessId = String(processId || "").trim();
  state.allProcesses.forEach((process) => {
    if (String(process.processId || "").trim() !== cleanProcessId) return;
    process.comments = comments;
    process.commentUpdatedAt = updatedAt;
    process.commentUserName = userName;
  });
  state.scheduleEntries.forEach((entry) => {
    if (String(entry.processId || "").trim() !== cleanProcessId || !entry.linkedProcess) return;
    entry.linkedProcess.comments = comments;
    entry.linkedProcess.commentUpdatedAt = updatedAt;
    entry.linkedProcess.commentUserName = userName;
  });
  state.fredyEntries.forEach((entry) => {
    if (String(entry.processId || "").trim() !== cleanProcessId || !entry.linkedProcess) return;
    entry.linkedProcess.comments = comments;
    entry.linkedProcess.commentUpdatedAt = updatedAt;
    entry.linkedProcess.commentUserName = userName;
  });
};

const updateProcessStatusState = ({ processId, status }) => {
  const cleanProcessId = String(processId || "").trim();
  state.allProcesses.forEach((process) => {
    if (String(process.processId || "").trim() !== cleanProcessId) return;
    process.migrationStatus = status || MIGRATION_STATUS.pending;
  });
  state.scheduleEntries.forEach((entry) => {
    if (String(entry.processId || "").trim() !== cleanProcessId || !entry.linkedProcess) return;
    entry.linkedProcess.migrationStatus = status || MIGRATION_STATUS.pending;
  });
  state.fredyEntries.forEach((entry) => {
    if (String(entry.processId || "").trim() !== cleanProcessId || !entry.linkedProcess) return;
    entry.linkedProcess.migrationStatus = status || MIGRATION_STATUS.pending;
  });
};

const syncCommentControls = (processId, comments) => {
  document
    .querySelectorAll(".comment-input, .schedule-comment-input")
    .forEach((input) => {
      if (input.dataset.processId === processId) input.value = comments;
    });
};

const handleCommentSave = async ({ processId, textarea, feedback, button }) => {
  const cleanProcessId = String(processId || "").trim();
  const comments = textarea?.value || "";
  const match = state.allProcesses.find((process) => String(process.processId || "").trim() === cleanProcessId);
  if (!match || !textarea || !feedback || !button) return;

  button.disabled = true;
  textarea.disabled = true;
  feedback.textContent = "Guardando...";
  feedback.className = "comment-feedback text-muted";

  try {
    const saved = await saveProcessComment({
      processId: cleanProcessId,
      comments,
      userName: localStorage.getItem("dashboard-user") || "local",
    });
    const savedComment = {
      processId: cleanProcessId,
      comments: saved.comments ?? comments,
      updatedAt: saved.updatedAt || new Date().toISOString(),
      userName: saved.userName || localStorage.getItem("dashboard-user") || "local",
    };
    updateProcessCommentState(savedComment);
    syncCommentControls(cleanProcessId, savedComment.comments);
    await appendHistoryEvent({
      entityType: "process",
      entityId: cleanProcessId,
      eventType: "comment",
      fieldName: "comments",
      oldValue: "",
      newValue: savedComment.comments,
      source: "google-sheet",
      userName: savedComment.userName,
    });
    feedback.textContent = "Guardado";
    feedback.className = "comment-feedback text-success";
  } catch (error) {
    feedback.textContent = "Error al guardar";
    feedback.className = "comment-feedback text-danger";
  } finally {
    button.disabled = false;
    textarea.disabled = false;
  }
};

const updateResponsableOptions = (processes) => {
  if (!responsableFilter) return;
  const preferredOrder = ["Jorge", "Johan", "Fredy"];
  const responsibles = Array.from(
    new Set(processes.map((process) => getProcessResponsible(process)).filter(Boolean))
  ).sort((a, b) => {
    const indexA = preferredOrder.indexOf(a);
    const indexB = preferredOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  const currentValue = responsableFilter.value;
  responsableFilter.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "Todos los responsables";
  responsableFilter.appendChild(allOption);

  responsibles.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = displayResponsible(name);
    responsableFilter.appendChild(option);
  });

  responsableFilter.value =
    currentValue !== "all" && !responsibles.includes(currentValue)
      ? "all"
      : currentValue;
};

const applyFilters = () => {
  if (!searchInput || !responsableFilter || !statusFilter) return;

  const base = getTeamFiltered(state.allProcesses, state.activeTeam);
  const filtered = filterProcesses(base, {
    query: searchInput.value,
    responsable: responsableFilter.value,
    statusValue: statusFilter.value,
    weekValue: weekFilter?.value || "all",
    typeValue: typeFilter?.value || "all",
    temporalMode: state.activeTeam === "F" ? "month" : "week",
  });
  const visibleProcessIds = new Set(
    getScheduleProcesses(filtered, state.activeTeam)
      .map((process) => process.processId)
      .filter(Boolean)
      .map(String)
  );
  const sourceScheduleEntries = state.activeTeam === "F" ? state.fredyEntries : state.scheduleEntries;
  const filteredScheduleEntries = filterScheduleEntries(sourceScheduleEntries, {
    weekValue: weekFilter?.value || "all",
    typeValue: typeFilter?.value || "all",
    processIds: visibleProcessIds,
  });

  renderDashboard(filtered, {
    activeTeam: state.activeTeam,
    scheduleEntries: filteredScheduleEntries,
    scheduleMode: state.activeTeam === "F" ? "month" : "week",
    historyEvents: state.historyEvents,
  });
};

const handleResult = async (result, fileName = DEFAULT_FILE_NAME) => {
  if (!result.processes.length) {
    renderEmptyState("No se encontraron procesos con datos válidos.");
    setStatus("Archivo cargado, pero sin filas válidas.", "error");
    return;
  }

  state.allProcesses = mergeProcessComments(result.processes, result.commentsByProcessId || {});
  state.scheduleEntries = relinkScheduleEntries(result.scheduleEntries || [], state.allProcesses);
  state.fredyEntries = relinkScheduleEntries(result.fredyEntries || [], state.allProcesses);
  state.sourceFileName = fileName;
  state.historyEvents = await loadHistoryEvents();
  updateResponsableOptions(getTeamFiltered(state.allProcesses, state.activeTeam));
  updateWeekOptions(state.activeTeam === "F" ? state.fredyEntries : state.scheduleEntries);
  updateTypeOptions(state.allProcesses);
  await recordImportSnapshot({
    fileName,
    processes: state.allProcesses,
    scheduleEntries: [...state.scheduleEntries, ...state.fredyEntries],
    warnings: result.warnings || [],
  });
  state.historyEvents = await loadHistoryEvents();
  applyFilters();

  if (result.warnings.length) {
    setStatus(result.warnings.join(" | "), "error");
  } else {
    setStatus(`Datos listos: ${result.processes.length} procesos, ${state.scheduleEntries.length} filas de cronograma y ${state.fredyEntries.length} filas Fredy cargadas.`, "success");
  }
};

const tryAutoLoad = async () => {
  setStatus("Buscando datos en Google Sheet...");
  try {
    await handleResult(await loadFromUrl(DEFAULT_FILE_NAME), DEFAULT_FILE_NAME);
  } catch (error) {
    setStatus("No se pudo cargar el Google Sheet. Usa Cargar Excel como respaldo.", "error");
    renderEmptyState(`Carga el Excel local (${LOCAL_EXCEL_FILE_NAME}) para ver los gráficos y el reparto de horas.`);
  }
};

fileInput?.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  setStatus("Procesando archivo...", "info");
  try {
    await handleResult(await loadFromFile(file), file.name);
  } catch (error) {
    setStatus("No se pudo leer el archivo. Revisa el formato.", "error");
  }
});

[searchInput, responsableFilter, statusFilter, weekFilter, typeFilter].forEach((element) => {
  element?.addEventListener("input", applyFilters);
});

document.getElementById("process-table-body")?.addEventListener("change", async (event) => {
  const target = event.target;
  if (!target.classList.contains("status-select")) return;

  const key = target.dataset.key;
  const processId = target.dataset.processId || "";
  const value = target.value;
  const match = state.allProcesses.find((process) => process.key === key);
  const previous = match?.migrationStatus || MIGRATION_STATUS.pending;
  if (!match) return;

  target.disabled = true;
  setStatus("Guardando estado en Google Sheets...", "info");

  try {
    await saveProcessStatus({
      processId,
      status: value || MIGRATION_STATUS.pending,
      userName: localStorage.getItem("dashboard-user") || "local",
    });
    updateProcessStatusState({ processId, status: value || MIGRATION_STATUS.pending });
    await appendHistoryEvent({
      entityType: "process",
      entityId: match.processId || match.key,
      eventType: "status_change",
      fieldName: "migrationStatus",
      oldValue: previous,
      newValue: value || MIGRATION_STATUS.pending,
      source: "google-sheet",
      userName: localStorage.getItem("dashboard-user") || "local",
    });
    state.historyEvents = await loadHistoryEvents();
    setStatus("Estado actualizado en Google Sheets.", "success");
    applyFilters();
  } catch (error) {
    target.value = previous;
    updateProcessStatusState({ processId, status: previous });
    setStatus("No se pudo actualizar el estado en Google Sheets.", "error");
  } finally {
    target.disabled = false;
  }
});

document.getElementById("process-table-body")?.addEventListener("click", async (event) => {
  const button = event.target.closest(".comment-save-button");
  if (!button) return;

  const row = button.closest("tr");
  await handleCommentSave({
    processId: button.dataset.processId || "",
    textarea: row?.querySelector(".comment-input"),
    feedback: row?.querySelector(".comment-feedback"),
    button,
  });
});

document.getElementById("weekly-schedule")?.addEventListener("click", async (event) => {
  const button = event.target.closest(".schedule-comment-save-button");
  if (!button) return;

  const item = button.closest(".schedule-item");
  await handleCommentSave({
    processId: button.dataset.processId || "",
    textarea: item?.querySelector(".schedule-comment-input"),
    feedback: item?.querySelector(".comment-feedback"),
    button,
  });
});

reloadButton?.addEventListener("click", tryAutoLoad);

document.querySelectorAll("[data-module]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    if (button.dataset.module) setActiveModule(button.dataset.module, state);
  });
});

document.querySelectorAll("[data-team]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    if (!link.dataset.team) return;
    setActiveTeam(link.dataset.team, state, () => {
      updateResponsableOptions(getTeamFiltered(state.allProcesses, state.activeTeam));
      updateWeekOptions(state.activeTeam === "F" ? state.fredyEntries : state.scheduleEntries);
      applyFilters();
    });
  });
});

setActiveModule("overview", state);
setActiveTeam("ALL", state, () => {
  updateResponsableOptions(getTeamFiltered(state.allProcesses, state.activeTeam));
  updateWeekOptions(state.scheduleEntries);
});
tryAutoLoad();
