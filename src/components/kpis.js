import { FREDY_STATUS, MIGRATION_STATUS } from "../config/constants.js";
import { formatNumber } from "../services/format.js";

export const updateStats = (metrics) => {
  const totalEl = document.getElementById("stat-total");
  const hoursEl = document.getElementById("stat-hours");
  const avgEl = document.getElementById("stat-avg");
  const balanceEl = document.getElementById("stat-balance");

  if (totalEl) totalEl.textContent = metrics.total.toString();
  if (hoursEl) hoursEl.textContent = formatNumber(metrics.totalHours, 1);
  if (avgEl) avgEl.textContent = formatNumber(metrics.avgHours, 1);
  if (balanceEl) balanceEl.textContent = formatNumber(metrics.balance, 1);
};

const getTypeStats = (metrics, type) => {
  const breakdown = metrics.breakdownByType?.[type] || {};
  const statusCounts = breakdown.statusCounts || {};
  const total = metrics.typeCounts?.[type] || breakdown.total || 0;
  const done = statusCounts[MIGRATION_STATUS.done] || 0;

  return {
    total,
    done,
    validating: statusCounts[MIGRATION_STATUS.validating] || 0,
    inProcess: statusCounts[MIGRATION_STATUS.inProcess] || 0,
    pending: statusCounts[MIGRATION_STATUS.pending] || 0,
    statusCounts,
  };
};

const countStatus = (stats, status) => stats.statusCounts?.[status] || 0;

const setText = (id, value) => {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
};

const setGroupVisibility = (activeTeam = "ALL") => {
  document.querySelectorAll("[data-kpi-group]").forEach((group) => {
    const groupType = group.dataset.kpiGroup;
    group.hidden = activeTeam !== "ALL" && activeTeam !== groupType;
  });
};

export const updateKpis = (metrics, options = {}) => {
  const jorgeEl = document.getElementById("kpi-jorge");
  const JohanEl = document.getElementById("kpi-Johan");
  const fredyEl = document.getElementById("kpi-fredy");
  const activeTeam = options.activeTeam || "ALL";
  const fredyMetrics = options.fredyMetrics || metrics;
  const fredyStats = getTypeStats(fredyMetrics, "F");
  const recoveriesStats = getTypeStats(metrics, "R");

  setGroupVisibility(activeTeam);

  const fredyDone = countStatus(fredyStats, FREDY_STATUS.done);
  setText("kpi-f-pending", countStatus(fredyStats, FREDY_STATUS.missingInputs));
  setText("kpi-f-in-process", countStatus(fredyStats, FREDY_STATUS.inputsDelivered));
  setText("kpi-f-validating", countStatus(fredyStats, FREDY_STATUS.inputComments));
  setText("kpi-f-missing-input-approval", countStatus(fredyStats, FREDY_STATUS.missingInputApproval));
  setText("kpi-f-input-approved", countStatus(fredyStats, FREDY_STATUS.inputApproved));
  setText("kpi-f-missing-process-approval", countStatus(fredyStats, FREDY_STATUS.missingProcessApproval));
  setText("kpi-f-process-approved", countStatus(fredyStats, FREDY_STATUS.processApproved));
  setText("kpi-f-migrated", fredyDone);
  setText("kpi-type-f", `${fredyDone} de ${fredyStats.total}`);
  setText("kpi-type-f-note", `Procesos Fredy: llevan ${fredyDone}, son ${fredyStats.total}`);

  setText("kpi-r-migrated", recoveriesStats.done);
  setText("kpi-r-validating", recoveriesStats.validating);
  setText("kpi-r-in-process", recoveriesStats.inProcess);
  setText("kpi-r-pending", recoveriesStats.pending);
  setText("kpi-type-r", `${recoveriesStats.done} de ${recoveriesStats.total}`);
  setText("kpi-type-r-note", `Procesos R: llevan ${recoveriesStats.done}, son ${recoveriesStats.total}`);

  if (jorgeEl) jorgeEl.textContent = formatNumber(metrics.hoursByResponsible.Jorge || 0, 0);
  if (JohanEl) JohanEl.textContent = formatNumber(metrics.hoursByResponsible.Johan || 0, 0);
  if (fredyEl) fredyEl.textContent = formatNumber(metrics.hoursByResponsible.Fredy || 0, 0);
};

export const updateTeamCards = (metrics, options = {}) => {
  const totalHours = metrics.totalHours || 0;
  const activeTeam = options.activeTeam || "ALL";

  document.querySelectorAll("[data-team-card]").forEach((card) => {
    const cardTeam = card.dataset.teamCard;
    card.hidden = activeTeam !== "ALL" && activeTeam !== cardTeam;
  });

  const updateCard = (name, prefix) => {
    const hours = metrics.hoursByResponsible[name] || 0;
    const count = metrics.countsByResponsible[name] || 0;
    const share = totalHours ? (hours / totalHours) * 100 : 0;

    const countEl = document.getElementById(`${prefix}-count`);
    const hoursEl = document.getElementById(`${prefix}-hours`);
    const shareEl = document.getElementById(`${prefix}-share`);
    const barEl = document.getElementById(`${prefix}-bar`);

    if (countEl) countEl.textContent = count;
    if (hoursEl) hoursEl.textContent = formatNumber(hours, 1);
    if (shareEl) shareEl.textContent = `${formatNumber(share, 1)}%`;
    if (barEl) barEl.style.width = `${share}%`;
  };

  updateCard("Jorge", "dev-jorge");
  updateCard("Johan", "dev-Johan");
  updateCard("Fredy", "dev-fredy");
};
