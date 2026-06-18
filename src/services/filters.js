import { FREDY_STATUS } from "../config/constants.js";

export const getProcessResponsible = (process) => {
  return process.personaCronograma || process.assignedTo || "";
};

export const getProcessStatus = (process, statusMode = "migration") => {
  if (statusMode === "fredy") return process.fredyStatus || FREDY_STATUS.missingInputs;
  return process.migrationStatus;
};

export const getTeamFiltered = (processes, team) => {
  if (team === "ALL") return processes;
  return processes.filter((process) => (process.team || "R") === team);
};

export const getScheduleProcesses = (processes, team) => {
  if (team === "F") return processes;
  if (team === "R") return processes;
  return processes.filter((process) => (process.team || "R") !== "F");
};

export const filterProcesses = (processes, { query, responsable, statusValue, weekValue = "all", typeValue = "all", temporalMode = "week", statusMode = "migration" }) => {
  const normalizedQuery = query.trim().toLowerCase();

  return processes.filter((process) => {
    if (responsable !== "all" && getProcessResponsible(process) !== responsable) return false;
    if (statusValue !== "all" && getProcessStatus(process, statusMode) !== statusValue) return false;
    if (typeValue !== "all" && (process.processType || process.team || "Sin tipo") !== typeValue) return false;
    if (weekValue !== "all") {
      if (temporalMode === "month") {
        const months = process.scheduleMonths || [];
        if (!months.includes(weekValue)) return false;
      } else {
        const week = Number.parseInt(weekValue, 10);
        const weeks = process.scheduleWeeks || [];
        if (!weeks.includes(week)) return false;
      }
    }
    if (!normalizedQuery) return true;

    const haystack = [process.name, process.phase, process.area, process.usuario, process.processId]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
};

export const filterScheduleEntries = (entries = [], { weekValue = "all", typeValue = "all", processIds = null }) => {
  return entries.filter((entry) => {
    if (weekValue !== "all") {
      if (entry.source === "fredy") {
        if (entry.monthKey !== weekValue) return false;
      } else if (entry.week !== Number.parseInt(weekValue, 10)) {
        return false;
      }
    }
    if (processIds && entry.processId && !processIds.has(String(entry.processId))) return false;
    if (typeValue !== "all") {
      const linkedType = entry.linkedProcess?.processType || entry.linkedProcess?.team || "Sin tipo";
      if (linkedType !== typeValue) return false;
    }
    return true;
  });
};
