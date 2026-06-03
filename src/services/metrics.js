import { MIGRATION_STATUS, RESPONSIBLE_ORDER } from "../config/constants.js";

const sumBy = (items, selector) =>
  items.reduce((total, item) => total + selector(item), 0);

export const buildResponsibles = (processes) => {
  const unique = new Set();
  processes.forEach((process) => {
    if (process.assignedTo) unique.add(process.assignedTo);
  });

  return Array.from(unique).sort((a, b) => {
    const indexA = RESPONSIBLE_ORDER.indexOf(a);
    const indexB = RESPONSIBLE_ORDER.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
};

export const computeMetrics = (processes) => {
  const total = processes.length;
  const totalHours = sumBy(processes, (process) => process.hours);
  const avgHours = total ? totalHours / total : 0;
  const responsibles = buildResponsibles(processes);
  const hoursByResponsible = {};
  const countsByResponsible = {};
  const statusCounts = {
    [MIGRATION_STATUS.pending]: 0,
    [MIGRATION_STATUS.inProcess]: 0,
    [MIGRATION_STATUS.validating]: 0,
    [MIGRATION_STATUS.done]: 0,
  };
  const typeCounts = {};
  const breakdownByType = {};

  responsibles.forEach((name) => {
    hoursByResponsible[name] = 0;
    countsByResponsible[name] = 0;
  });

  processes.forEach((process) => {
    if (!hoursByResponsible[process.assignedTo]) hoursByResponsible[process.assignedTo] = 0;
    if (!countsByResponsible[process.assignedTo]) countsByResponsible[process.assignedTo] = 0;
    hoursByResponsible[process.assignedTo] += process.hours;
    countsByResponsible[process.assignedTo] += 1;
    const status = process.migrationStatus || MIGRATION_STATUS.pending;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    const type = process.processType || process.team || "Sin tipo";
    typeCounts[type] = (typeCounts[type] || 0) + 1;
    if (!breakdownByType[type]) {
      breakdownByType[type] = {
        total: 0,
        hours: 0,
        statusCounts: {},
        people: {},
      };
    }
    breakdownByType[type].total += 1;
    breakdownByType[type].hours += process.hours;
    breakdownByType[type].statusCounts[status] = (breakdownByType[type].statusCounts[status] || 0) + 1;
    breakdownByType[type].people[process.assignedTo] = (breakdownByType[type].people[process.assignedTo] || 0) + 1;
  });

  const hoursList = responsibles.map((name) => hoursByResponsible[name] || 0);
  const balance = hoursList.length > 1 ? Math.max(...hoursList) - Math.min(...hoursList) : 0;

  return {
    total,
    totalHours,
    avgHours,
    hoursByResponsible,
    countsByResponsible,
    balance,
    statusCounts,
    typeCounts,
    breakdownByType,
    responsibles,
  };
};

const normalizePerson = (value) => String(value || "").trim().toLowerCase();

export const buildWeeklyComparison = (scheduleEntries = [], processes = [], people = []) => {
  const completedIds = new Set(
    processes
      .filter((process) => (process.migrationStatus || MIGRATION_STATUS.pending) === MIGRATION_STATUS.done)
      .map((process) => String(process.processId || "").trim())
      .filter(Boolean)
  );
  const selectedPeople = people.length
    ? people
    : Array.from(new Set(scheduleEntries.map((entry) => entry.person).filter(Boolean)));
  const weekSet = new Set(
    scheduleEntries
      .map((entry) => entry.week)
      .filter((week) => Number.isInteger(week) && week > 0)
  );
  const weeks = Array.from(weekSet).sort((a, b) => a - b);

  return selectedPeople.map((person) => {
    const personKey = normalizePerson(person);
    const planned = weeks.map((week) =>
      scheduleEntries.filter((entry) => entry.week === week && normalizePerson(entry.person) === personKey).length
    );
    const done = weeks.map((week) =>
      scheduleEntries.filter((entry) => {
        if (entry.week !== week || normalizePerson(entry.person) !== personKey) return false;
        return completedIds.has(String(entry.processId || "").trim());
      }).length
    );

    return {
      person,
      weeks,
      series: [
        { name: "Debio hacer", data: planned },
        { name: "Realmente hizo", data: done },
      ],
    };
  });
};
