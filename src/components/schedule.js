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

const buildItemLabel = (entry) => {
  const title = entry.processName || entry.linkedProcess?.name || "Proceso";
  const status = entry.linkedProcess?.migrationStatus || MIGRATION_STATUS.pending;
  const details = [entry.part, entry.client]
    .filter(Boolean)
    .map((value) => escapeHtml(value))
    .join(" - ");
  const suffix = details ? `<span>${details}</span>` : "";

  return `
    <li>
      <strong>${escapeHtml(title)}</strong>
      ${suffix}
      <span>${formatNumber(entry.hours || 0, 1)}h - ${escapeHtml(displayStatus(status))}</span>
    </li>
  `;
};

const buildList = (items) => {
  if (!items.length) return '<div class="person-list empty">Sin procesos</div>';
  return `<ul class="process-list">${items.map(buildItemLabel).join("")}</ul>`;
};

export const renderWeeklySchedule = (scheduleEntries = []) => {
  const list = document.getElementById("weekly-schedule");
  const meta = document.getElementById("schedule-meta");
  if (!list || !meta) return;

  if (!scheduleEntries.length) {
    list.innerHTML = "";
    meta.textContent = "Sin datos de cronograma.";
    return;
  }

  const weeks = groupSchedule(scheduleEntries);
  const totalHours = scheduleEntries.reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0);

  meta.textContent = `${scheduleEntries.length} filas planificadas - ${formatNumber(totalHours, 1)}h - ${weeks.length} semanas`;

  list.innerHTML = weeks
    .map((week) => {
      const people = Array.from(week.people.values()).sort((a, b) =>
        getDisplayName({ person: a.name }).localeCompare(getDisplayName({ person: b.name }))
      );
      const pills = people
        .map((person) => `<span class="pill">${escapeHtml(displayResponsible(person.name))}: ${formatNumber(person.totalHours, 1)}h</span>`)
        .join("");
      const peopleBlocks = people
        .map((person) => `
          <div class="schedule-person">
            <div class="person-name">${escapeHtml(displayResponsible(person.name))}</div>
            <div class="person-metrics">${person.items.length} partes - ${formatNumber(person.totalHours, 1)}h</div>
            ${buildList(person.items)}
          </div>
        `)
        .join("");
      const title = week.weekNumber === 0 ? "Semana sin definir" : `Semana ${week.weekNumber}`;

      return `
        <div class="schedule-card">
          <div class="schedule-week">
            ${title}
            <span>${formatNumber(week.totalHours, 1)}h planificadas</span>
          </div>
          <div class="person-pills">${pills}</div>
          <div class="schedule-people">${peopleBlocks}</div>
        </div>
      `;
    })
    .join("");
};
