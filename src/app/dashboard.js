import { MIGRATION_STATUS } from "../config/constants.js";
import { DEFAULT_FILE_NAME, loadFromFile, loadFromUrl } from "../data/excel-loader.js";
import { setActiveModule, setActiveTeam } from "../components/sidebar.js";
import { renderDashboard, renderEmptyState } from "../components/ui-state.js";
import { filterProcesses, filterScheduleEntries, getScheduleProcesses, getTeamFiltered } from "../services/filters.js";
import { displayResponsible } from "../services/format.js";
import {
  appendHistoryEvent,
  loadHistoryEvents,
  loadStatusMap,
  recordImportSnapshot,
  saveStatusMap,
} from "../services/storage.js";

const statusEl = document.getElementById("load-status");
const fileInput = document.getElementById("file-input");
const reloadButton = document.getElementById("reload-button");
const searchInput = document.getElementById("search-input");
const responsableFilter = document.getElementById("responsable-filter");
const statusFilter = document.getElementById("status-filter");
const weekFilter = document.getElementById("week-filter");
const typeFilter = document.getElementById("type-filter");

const state = {
  allProcesses: [],
  scheduleEntries: [],
  statusMap: loadStatusMap(),
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
  const weeks = Array.from(
    new Set(scheduleEntries.map((entry) => entry.week).filter((week) => Number.isInteger(week) && week > 0))
  ).sort((a, b) => a - b);
  const currentValue = weekFilter.value || "all";
  weekFilter.innerHTML = '<option value="all">Todas las semanas</option>';
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

const applyStoredStatus = (processes) => {
  processes.forEach((process) => {
    const stored = state.statusMap[process.key];
    if (stored) process.migrationStatus = stored;
  });
};

const updateResponsableOptions = (processes) => {
  if (!responsableFilter) return;
  const preferredOrder = ["Jorge", "Johan", "Fredy"];
  const responsibles = Array.from(
    new Set(processes.map((process) => process.assignedTo).filter(Boolean))
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
  });
  const visibleProcessIds = new Set(
    getScheduleProcesses(filtered, state.activeTeam)
      .map((process) => process.processId)
      .filter(Boolean)
      .map(String)
  );
  const filteredScheduleEntries = filterScheduleEntries(state.scheduleEntries, {
    weekValue: weekFilter?.value || "all",
    typeValue: typeFilter?.value || "all",
    processIds: visibleProcessIds,
  });

  renderDashboard(filtered, {
    activeTeam: state.activeTeam,
    skipSchedule: state.activeTeam === "F",
    scheduleEntries: filteredScheduleEntries,
    historyEvents: state.historyEvents,
  });
};

const handleResult = async (result, fileName = DEFAULT_FILE_NAME) => {
  if (!result.processes.length) {
    renderEmptyState("No se encontraron procesos con datos válidos.");
    setStatus("Archivo cargado, pero sin filas válidas.", "error");
    return;
  }

  state.allProcesses = result.processes;
  state.scheduleEntries = result.scheduleEntries || [];
  state.sourceFileName = fileName;
  applyStoredStatus(state.allProcesses);
  state.historyEvents = await loadHistoryEvents();
  updateResponsableOptions(getTeamFiltered(state.allProcesses, state.activeTeam));
  updateWeekOptions(state.scheduleEntries);
  updateTypeOptions(state.allProcesses);
  await recordImportSnapshot({
    fileName,
    processes: state.allProcesses,
    scheduleEntries: state.scheduleEntries,
    warnings: result.warnings || [],
  });
  state.historyEvents = await loadHistoryEvents();
  applyFilters();

  if (result.warnings.length) {
    setStatus(result.warnings.join(" | "), "error");
  } else {
    setStatus(`Datos listos: ${result.processes.length} procesos y ${state.scheduleEntries.length} filas de cronograma cargados.`, "success");
  }
};

const tryAutoLoad = async () => {
  setStatus(`Buscando ${DEFAULT_FILE_NAME}...`);
  try {
    await handleResult(await loadFromUrl(DEFAULT_FILE_NAME), DEFAULT_FILE_NAME);
  } catch (error) {
    setStatus("No se encontró el archivo automáticamente. Usa Cargar Excel.", "error");
    renderEmptyState("Carga el Excel para ver los gráficos y el reparto de horas.");
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
  const value = target.value;
  const oldValue = state.statusMap[key] || "";
  state.statusMap[key] = value;
  saveStatusMap(state.statusMap);

  const match = state.allProcesses.find((process) => process.key === key);
  if (match) {
    const previous = match.migrationStatus || oldValue || MIGRATION_STATUS.pending;
    match.migrationStatus = value || MIGRATION_STATUS.pending;
    await appendHistoryEvent({
      entityType: "process",
      entityId: match.processId || match.key,
      eventType: "status_change",
      fieldName: "migrationStatus",
      oldValue: previous,
      newValue: match.migrationStatus,
      source: "dashboard",
      userName: localStorage.getItem("dashboard-user") || "local",
    });
    state.historyEvents = await loadHistoryEvents();
  }
  applyFilters();
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
      applyFilters();
    });
  });
});

setActiveModule("overview", state);
setActiveTeam("ALL", state, () => {
  updateResponsableOptions(getTeamFiltered(state.allProcesses, state.activeTeam));
});
tryAutoLoad();
