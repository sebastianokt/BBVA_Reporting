import { MIGRATION_STATUS } from "../config/constants.js";
import {
  buildInProcessStatus,
  buildMigrationStatus,
  buildValidationStatus,
  normalizeKey,
  normalizeTeam,
  parseNumber,
} from "./migration-rules.js";
import { assignByHours } from "../services/team-assignment.js";

const TEAM_DEFAULT = "R";
const FALLBACK_AREA_INDEX = 4;
const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const buildHeaderMap = (headers) => {
  const map = new Map();
  headers.forEach((header, index) => {
    if (!header) return;
    const key = normalizeKey(header);
    if (!key || map.has(key)) return;
    map.set(key, index);
  });
  return map;
};

const findIndexByKey = (headerMap, keys) => {
  for (const key of keys) {
    const normalized = normalizeKey(key);
    if (headerMap.has(normalized)) return headerMap.get(normalized);
  }
  return -1;
};

const findIndexByContains = (headers, fragment) => {
  const needle = normalizeKey(fragment);
  for (let index = 0; index < headers.length; index += 1) {
    const header = headers[index];
    if (header && normalizeKey(header).includes(needle)) return index;
  }
  return -1;
};

const buildProcessKey = (name, phase, area, index) => {
  const compact = [name, phase, area]
    .map((value) => normalizeKey(value))
    .filter(Boolean)
    .join("|");
  return compact ? compact : `row-${index + 1}`;
};

const parseWeekNumber = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const match = String(value).trim().toLowerCase().match(/\d+/);
  if (!match) return null;
  const week = Number.parseInt(match[0], 10);
  if (!Number.isFinite(week) || week <= 0) return null;
  return week;
};

const parseMonthValue = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return { month: "Sin mes", monthKey: "sin-mes", monthOrder: 9999 };
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const month = value.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
    const monthKey = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
    return { month, monthKey, monthOrder: value.getFullYear() * 100 + value.getMonth() + 1 };
  }
  if (typeof value === "number" && value > 1000 && typeof XLSX !== "undefined") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed?.y && parsed?.m) {
      const date = new Date(parsed.y, parsed.m - 1, 1);
      const month = date.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
      const monthKey = `${parsed.y}-${String(parsed.m).padStart(2, "0")}`;
      return { month, monthKey, monthOrder: parsed.y * 100 + parsed.m };
    }
  }
  const raw = String(value).trim();
  const normalized = normalizeKey(raw);
  const numeric = Number.parseInt(raw, 10);
  if (Number.isInteger(numeric) && numeric > 0 && numeric <= 12) {
    return { month: MONTH_NAMES[numeric - 1], monthKey: String(numeric), monthOrder: numeric };
  }
  const match = normalized.match(/(\d{4})\s+(\d{1,2})|(\d{1,2})\s+(\d{4})/);
  if (match) {
    const year = Number.parseInt(match[1] || match[4], 10);
    const monthNumber = Number.parseInt(match[2] || match[3], 10);
    if (monthNumber >= 1 && monthNumber <= 12) {
      return {
        month: raw,
        monthKey: `${year}-${String(monthNumber).padStart(2, "0")}`,
        monthOrder: year * 100 + monthNumber,
      };
    }
  }
  return { month: raw, monthKey: normalized || raw, monthOrder: 5000 };
};

const getCell = (row, index) => {
  if (index < 0 || index >= row.length) return "";
  return row[index];
};

const buildProcessMap = (processes = []) => {
  return new Map(
    processes
      .filter((process) => process.processId)
      .map((process) => [String(process.processId).trim(), process])
  );
};

export const parseWorksheet = (worksheet) => {
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  const headers = rows[0] || [];
  const headerMap = buildHeaderMap(headers);

  const idx = {
    processId: findIndexByKey(headerMap, ["id proceso", "id_proceso"]),
    phase: findIndexByKey(headerMap, ["id"]),
    discard: findIndexByKey(headerMap, ["descartado"]),
    name: findIndexByKey(headerMap, ["nombre de proceso"]),
    usuario: findIndexByKey(headerMap, ["usuario"]),
    team: findIndexByContains(headers, "se debe migrar nosotros"),
    lineas: findIndexByContains(headers, "lineas de codigo"),
    factor: findIndexByContains(headers, "factor de complejidad"),
    score: findIndexByContains(headers, "score de complejidad"),
    hours: findIndexByContains(headers, "tiempo total de traduccion y validacion"),
    scripts: findIndexByContains(headers, "scripts"),
    talla: findIndexByContains(headers, "talla de complejidad"),
    migration: findIndexByContains(headers, "migr"),
    yaMigrado: findIndexByContains(headers, "ya migrado"),
    validating: findIndexByContains(headers, "validando"),
    inProcess: findIndexByKey(headerMap, ["en proceso"]),
  };

  if (idx.hours === -1) idx.hours = findIndexByContains(headers, "horas acumuladas de esfuerzo");

  const processes = rows
    .slice(1)
    .filter((row) => row.some((value) => String(value).trim() !== ""))
    .map((row, index) => {
      const name = String(getCell(row, idx.name) || "Proceso").trim();
      const phase = String(getCell(row, idx.phase) || "").trim();
      const area = String(getCell(row, FALLBACK_AREA_INDEX) || "").trim();
      const rawProcessId = getCell(row, idx.processId);
      const processId = String(rawProcessId ?? "").trim();

      const validationStatus = buildValidationStatus(getCell(row, idx.validating));
      const inProcessStatus = buildInProcessStatus(getCell(row, idx.inProcess));
      const migratedByColumn = buildMigrationStatus(getCell(row, idx.yaMigrado)) === MIGRATION_STATUS.done;
      const statusSource =
        migratedByColumn || buildMigrationStatus(getCell(row, idx.migration)) === MIGRATION_STATUS.done
          ? headers[idx.yaMigrado] || headers[idx.migration] || "Ya migrado"
          : validationStatus === MIGRATION_STATUS.validating
            ? headers[idx.validating] || "Validando"
            : inProcessStatus === MIGRATION_STATUS.inProcess
              ? headers[idx.inProcess] || "En proceso"
              : "Sin marca";
      const migrationStatus =
        migratedByColumn || buildMigrationStatus(getCell(row, idx.migration)) === MIGRATION_STATUS.done
          ? MIGRATION_STATUS.done
          : validationStatus === MIGRATION_STATUS.validating
            ? MIGRATION_STATUS.validating
            : inProcessStatus === MIGRATION_STATUS.inProcess
              ? MIGRATION_STATUS.inProcess
              : MIGRATION_STATUS.pending;

      const team = normalizeTeam(getCell(row, idx.team)) || TEAM_DEFAULT;

      return {
        id: `${index + 1}`,
        processId,
        key: buildProcessKey(name, phase, area, index),
        phase,
        name: name === "" ? `Proceso ${index + 1}` : name,
        area,
        usuario: String(getCell(row, idx.usuario) || "").trim(),
        discardedFlag: String(getCell(row, idx.discard) || "").trim(),
        migrationStatus,
        statusSource,
        team,
        processType: team,
        hours: parseNumber(getCell(row, idx.hours)),
        factor: parseNumber(getCell(row, idx.factor)),
        score: parseNumber(getCell(row, idx.score)),
        lineas: parseNumber(getCell(row, idx.lineas)),
        scripts: parseNumber(getCell(row, idx.scripts)),
        talla: String(getCell(row, idx.talla) || "").trim(),
        orderIndex: index,
      };
    });

  const warnings = [];
  if (idx.processId === -1) warnings.push("No se encontro columna ID_PROCESO en Hoja 1.");
  if (idx.hours === -1) warnings.push("No se encontro columna de horas de dificultad.");

  assignByHours(processes);
  return { processes, warnings };
};

export const parseScheduleWorksheet = (worksheet, processes = []) => {
  if (!worksheet) return { scheduleEntries: [], warnings: ["No se encontro la hoja Cronograma."] };

  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  const headers = rows[0] || [];
  const headerMap = buildHeaderMap(headers);
  const idx = {
    processId: findIndexByKey(headerMap, ["id proceso", "id_proceso"]),
    week: findIndexByKey(headerMap, ["semana"]),
    person: findIndexByKey(headerMap, ["persona"]),
    client: findIndexByKey(headerMap, ["cliente"]),
    processName: findIndexByKey(headerMap, ["proceso"]),
    part: findIndexByKey(headerMap, ["parte"]),
    hours: findIndexByKey(headerMap, ["horas"]),
  };

  const warnings = [];
  const required = [
    ["ID_PROCESO", idx.processId],
    ["Semana", idx.week],
    ["Persona", idx.person],
    ["Proceso", idx.processName],
    ["Horas", idx.hours],
  ];
  required.forEach(([name, index]) => {
    if (index === -1) warnings.push(`No se encontro columna ${name} en Cronograma.`);
  });

  const processById = buildProcessMap(processes);
  const unmatchedIds = new Set();

  const scheduleEntries = rows
    .slice(1)
    .filter((row) => row.some((value) => String(value).trim() !== ""))
    .map((row, index) => {
      const processId = String(getCell(row, idx.processId) ?? "").trim();
      const linkedProcess = processById.get(processId) || null;
      if (processId && !linkedProcess) unmatchedIds.add(processId);

      return {
        id: `${processId || "sin-id"}-${index + 1}`,
        processId,
        week: parseWeekNumber(getCell(row, idx.week)),
        person: String(getCell(row, idx.person) || "").trim(),
        client: String(getCell(row, idx.client) || "").trim(),
        processName: String(getCell(row, idx.processName) || linkedProcess?.name || "Proceso").trim(),
        part: String(getCell(row, idx.part) || "").trim(),
        hours: parseNumber(getCell(row, idx.hours)),
        linkedProcess,
        orderIndex: index,
      };
    })
    .filter((entry) => entry.week !== null || entry.processId || entry.processName);

  if (unmatchedIds.size) {
    warnings.push(`Cronograma tiene ID_PROCESO sin coincidencia en Hoja 1: ${Array.from(unmatchedIds).join(", ")}.`);
  }

  scheduleEntries.forEach((entry) => {
    if (!entry.linkedProcess) return;
    if (!entry.linkedProcess.scheduleWeeks) entry.linkedProcess.scheduleWeeks = [];
    if (!entry.linkedProcess.schedulePeople) entry.linkedProcess.schedulePeople = [];
    if (entry.week !== null && !entry.linkedProcess.scheduleWeeks.includes(entry.week)) {
      entry.linkedProcess.scheduleWeeks.push(entry.week);
    }
    if (entry.person && !entry.linkedProcess.schedulePeople.includes(entry.person)) {
      entry.linkedProcess.schedulePeople.push(entry.person);
    }
    if (!entry.linkedProcess.personaCronograma && entry.person) {
      entry.linkedProcess.personaCronograma = entry.person;
    }
    if (!entry.linkedProcess.semanaPlanificada && entry.week !== null) {
      entry.linkedProcess.semanaPlanificada = entry.week;
    }
  });

  return { scheduleEntries, warnings };
};

export const parseFredyWorksheet = (worksheet, processes = []) => {
  if (!worksheet) return { fredyEntries: [], warnings: [] };

  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", cellDates: true });
  const headers = rows[0] || [];
  const headerMap = buildHeaderMap(headers);
  const idx = {
    processId: findIndexByKey(headerMap, ["id proceso", "id_proceso"]),
    month: findIndexByKey(headerMap, ["mes"]),
    person: findIndexByKey(headerMap, ["persona"]),
    client: findIndexByKey(headerMap, ["cliente"]),
    processName: findIndexByKey(headerMap, ["proceso"]),
    status: findIndexByKey(headerMap, ["estado"]),
  };

  const warnings = [];
  [
    ["ID_PROCESO", idx.processId],
    ["Mes", idx.month],
    ["Persona", idx.person],
    ["Cliente", idx.client],
    ["Proceso", idx.processName],
    ["Estado", idx.status],
  ].forEach(([name, index]) => {
    if (index === -1) warnings.push(`No se encontro columna ${name} en Fredy.`);
  });
  if (warnings.length) return { fredyEntries: [], warnings };

  const processById = buildProcessMap(processes);
  const unmatchedIds = new Set();
  const fredyEntries = rows
    .slice(1)
    .filter((row) => row.some((value) => String(value).trim() !== ""))
    .map((row, index) => {
      const processId = String(getCell(row, idx.processId) ?? "").trim();
      const linkedProcess = processById.get(processId) || null;
      if (processId && !linkedProcess) unmatchedIds.add(processId);
      const monthData = parseMonthValue(getCell(row, idx.month));
      const status = String(getCell(row, idx.status) || "").trim();

      return {
        id: `fredy-${processId || "sin-id"}-${index + 1}`,
        source: "fredy",
        processId,
        month: monthData.month,
        monthKey: monthData.monthKey,
        monthOrder: monthData.monthOrder,
        person: String(getCell(row, idx.person) || "").trim(),
        client: String(getCell(row, idx.client) || "").trim(),
        processName: String(getCell(row, idx.processName) || linkedProcess?.name || "Proceso").trim(),
        status,
        part: "",
        hours: 0,
        linkedProcess,
        orderIndex: index,
      };
    })
    .filter((entry) => entry.monthKey || entry.processId || entry.processName);

  if (unmatchedIds.size) {
    warnings.push(`Fredy tiene ID_PROCESO sin coincidencia en Hoja 1: ${Array.from(unmatchedIds).join(", ")}.`);
  }

  fredyEntries.forEach((entry) => {
    if (!entry.linkedProcess) return;
    if (!entry.linkedProcess.scheduleMonths) entry.linkedProcess.scheduleMonths = [];
    if (!entry.linkedProcess.schedulePeople) entry.linkedProcess.schedulePeople = [];
    if (entry.monthKey && !entry.linkedProcess.scheduleMonths.includes(entry.monthKey)) {
      entry.linkedProcess.scheduleMonths.push(entry.monthKey);
    }
    if (entry.person && !entry.linkedProcess.schedulePeople.includes(entry.person)) {
      entry.linkedProcess.schedulePeople.push(entry.person);
    }
    if (!entry.linkedProcess.personaCronograma && entry.person) {
      entry.linkedProcess.personaCronograma = entry.person;
    }
    if (entry.status) {
      entry.linkedProcess.fredyStatus = entry.status;
    }
  });

  return { fredyEntries, warnings };
};

export const parseCommentsWorksheet = (worksheet) => {
  if (!worksheet) return { commentsByProcessId: {}, warnings: [] };

  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  const headers = rows[0] || [];
  const headerMap = buildHeaderMap(headers);
  const idx = {
    processId: findIndexByKey(headerMap, ["id proceso", "id_proceso"]),
    comments: findIndexByKey(headerMap, ["comentarios", "comentario", "novedades", "novedad"]),
    updatedAt: findIndexByKey(headerMap, ["fecha", "actualizado", "fecha actualizacion"]),
    userName: findIndexByKey(headerMap, ["usuario", "user", "responsable"]),
  };

  const warnings = [];
  if (idx.processId === -1) warnings.push("No se encontro columna ID_PROCESO en Comentarios.");
  if (idx.comments === -1) warnings.push("No se encontro columna Comentarios en Comentarios.");
  if (warnings.length) return { commentsByProcessId: {}, warnings };

  const commentsByProcessId = {};
  rows
    .slice(1)
    .filter((row) => row.some((value) => String(value).trim() !== ""))
    .forEach((row) => {
      const processId = String(getCell(row, idx.processId) ?? "").trim();
      if (!processId) return;
      commentsByProcessId[processId] = {
        processId,
        comments: String(getCell(row, idx.comments) ?? "").trim(),
        updatedAt: String(getCell(row, idx.updatedAt) ?? "").trim(),
        userName: String(getCell(row, idx.userName) ?? "").trim(),
      };
    });

  return { commentsByProcessId, warnings };
};
