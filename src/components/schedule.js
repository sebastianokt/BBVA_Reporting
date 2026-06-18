import { MIGRATION_STATUS } from "../config/constants.js";
import { displayResponsible, displayStatus, escapeHtml, formatNumber } from "../services/format.js";

const getDisplayName = (entry) => {
  const value = entry.person || "Sin responsable";
  return displayResponsible(value);
};

const groupSchedule = (entries) => {
  const weeks = new Map();

  entries.forEach((entry) => {
    const weekNumber = Number.isInteger(entry.week) && entry.week > 0 ? entry.week : 0;
    if (!weeks.has(weekNumber)) {
      weeks.set(weekNumber, {
        weekNumber,
        totalHours: 0,
        people: new Map(),
      });
    }

    const week = weeks.get(weekNumber);
    const personKey = entry.person || "Sin responsable";
    if (!week.people.has(personKey)) {
      week.people.set(personKey, {
        name: personKey,
        totalHours: 0,
        items: [],
      });
    }

    const person = week.people.get(personKey);
    const hours = Number(entry.hours) || 0;
    week.totalHours += hours;
    person.totalHours += hours;
    person.items.push(entry);
  });

  return Array.from(weeks.values()).sort((a, b) => {
    if (a.weekNumber === 0) return 1;
    if (b.weekNumber === 0) return -1;
    return a.weekNumber - b.weekNumber;
  });
};

const groupMonthlySchedule = (entries) => {
  const months = new Map();

  entries.forEach((entry) => {
    const monthKey = entry.monthKey || "sin-mes";
    if (!months.has(monthKey)) {
      months.set(monthKey, {
        monthKey,
        month: entry.month || "Sin mes",
        monthOrder: entry.monthOrder || 9999,
        people: new Map(),
      });
    }

    const month = months.get(monthKey);
    const personKey = entry.person || "Sin responsable";
    if (!month.people.has(personKey)) {
      month.people.set(personKey, {
        name: personKey,
        items: [],
      });
    }

    month.people.get(personKey).items.push(entry);
  });

  return Array.from(months.values()).sort((a, b) => {
    return (a.monthOrder || 9999) - (b.monthOrder || 9999) || String(a.month).localeCompare(String(b.month));
  });
};

const getStatusClass = (status) => {
  if (status === MIGRATION_STATUS.done) return "tag-done";
  if (status === MIGRATION_STATUS.validating) return "tag-validating";
  if (status === MIGRATION_STATUS.inProcess) return "tag-in-process";
  return "tag-pending";
};

const buildItemLabel = (entry, options = {}) => {
  const title = entry.processName || entry.linkedProcess?.name || "Proceso";
  const status = entry.linkedProcess?.migrationStatus || MIGRATION_STATUS.pending;
  const processId = String(entry.processId || entry.linkedProcess?.processId || "").trim();
  const comments = entry.linkedProcess?.comments || "";
  const details = [entry.part, entry.client]
    .filter(Boolean)
    .map((value) => escapeHtml(value))
    .join(" · ");
  const meta = [
    processId ? `ID ${escapeHtml(processId)}` : "Sin ID_PROCESO",
    details,
  ].filter(Boolean).join(" · ");

  return `
    <div class="schedule-item">
      <div class="schedule-item-main">
        <div>
          <div class="schedule-item-title">${escapeHtml(title)}</div>
          <div class="schedule-item-meta">${meta}</div>
        </div>
        <div class="schedule-item-badges">
          <span class="tag-pill ${getStatusClass(status)}">${escapeHtml(displayStatus(status))}</span>
          <span class="schedule-hours">${options.mode === "month" ? "1 parte" : `${formatNumber(entry.hours || 0, 1)}h`}</span>
        </div>
      </div>
      <div class="schedule-comment">
        <input
          class="schedule-comment-input"
          data-process-id="${escapeHtml(processId)}"
          ${processId ? "" : "disabled"}
          placeholder="${processId ? "Novedad del proceso" : "Sin ID_PROCESO"}"
          value="${escapeHtml(comments)}"
        />
        <div class="schedule-comment-actions">
          <button
            class="btn btn-outline-primary btn-sm schedule-comment-save-button"
            type="button"
            data-process-id="${escapeHtml(processId)}"
            ${processId ? "" : "disabled"}
          >
            Guardar
          </button>
          <span class="comment-feedback text-muted"></span>
        </div>
      </div>
    </div>
  `;
};

const buildList = (items, options = {}) => {
  if (!items.length) return '<div class="schedule-empty">Sin procesos</div>';
  return `<div class="schedule-items">${items.map((item) => buildItemLabel(item, options)).join("")}</div>`;
};

export const renderWeeklySchedule = (scheduleEntries = [], options = {}) => {
  const list = document.getElementById("weekly-schedule");
  const meta = document.getElementById("schedule-meta");
  if (!list || !meta) return;

  if (!scheduleEntries.length) {
    list.innerHTML = "";
    meta.textContent = "Sin datos de cronograma.";
    return;
  }

  const isMonthMode = options.mode === "month";
  const groups = isMonthMode ? groupMonthlySchedule(scheduleEntries) : groupSchedule(scheduleEntries);
  const totalHours = scheduleEntries.reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0);

  meta.textContent = isMonthMode
    ? `${scheduleEntries.length} filas planificadas - ${groups.length} meses`
    : `${scheduleEntries.length} filas planificadas - ${formatNumber(totalHours, 1)}h - ${groups.length} semanas`;

  list.innerHTML = groups
    .map((group) => {
      const people = Array.from(group.people.values()).sort((a, b) =>
        getDisplayName({ person: a.name }).localeCompare(getDisplayName({ person: b.name }))
      );
      const processCount = new Set(
        people.flatMap((person) => person.items.map((item) => String(item.processId || "").trim()).filter(Boolean))
      ).size;
      const partsCount = people.reduce((total, person) => total + person.items.length, 0);
      const groupHours = isMonthMode
        ? 0
        : people.reduce(
            (total, person) => total + person.items.reduce((sum, item) => sum + (Number(item.hours) || 0), 0),
            0
          );
      const peopleBlocks = people
        .map((person) => `
          <div class="schedule-person">
            <div class="schedule-person-header">
              <div>
                <div class="person-name">${escapeHtml(displayResponsible(person.name))}</div>
                <div class="person-metrics">${person.items.length} partes${isMonthMode ? "" : ` · ${formatNumber(person.totalHours, 1)}h`}</div>
              </div>
              <span class="pill">${isMonthMode ? `${person.items.length} partes` : `${formatNumber(person.totalHours, 1)}h`}</span>
            </div>
            ${buildList(person.items, { mode: options.mode })}
          </div>
        `)
        .join("");
      const title = isMonthMode
        ? group.month
        : group.weekNumber === 0 ? "Semana sin definir" : `Semana ${group.weekNumber}`;

      return `
        <div class="schedule-card">
          <div class="schedule-week">
            ${title}
            <span>${isMonthMode ? `${partsCount} partes planificadas` : `${formatNumber(group.totalHours ?? groupHours, 1)}h planificadas`}</span>
          </div>
          <div class="schedule-summary">
            <span>${processCount} procesos</span>
            <span>${people.length} responsables</span>
            <span>${partsCount} partes</span>
          </div>
          <div class="schedule-people">${peopleBlocks}</div>
        </div>
      `;
    })
    .join("");
};
