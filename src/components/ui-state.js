import { MIGRATION_STATUS } from "../config/constants.js";
import {
  renderEmptyChart,
  renderLineChart,
  renderMonthlyStatusChart,
  renderResponsibleChart,
  renderStatusBarChart,
  renderStatusChart,
  renderWeeklyComparisonChart,
} from "./charts.js";
import { updateKpis, updateStats, updateTeamCards } from "./kpis.js";
import { renderWeeklySchedule } from "./schedule.js";
import { renderDistributionTable, renderHistoryTable, renderTable, renderTypeBreakdownTable } from "./tables.js";
import { buildWeeklyComparison, computeMetrics } from "../services/metrics.js";
import { displayResponsible } from "../services/format.js";

export const buildLineSeries = (processes, responsibles) => {
  return responsibles.map((responsable) => {
    let cumulative = 0;
    const data = processes
      .filter((process) => process.assignedTo === responsable)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((process, index) => {
        cumulative += process.hours;
        return { x: index + 1, y: Number(cumulative.toFixed(2)) };
      });
    return { name: displayResponsible(responsable), data };
  });
};

const setChartTitle = (id, text) => {
  const element = document.getElementById(id);
  if (element) element.textContent = text;
};

const setRecoveriesChartVisibility = (visible) => {
  document.querySelectorAll("[data-recoveries-chart]").forEach((element) => {
    element.hidden = !visible;
  });
};

const setTypeBreakdownVisibility = (visible) => {
  const element = document.getElementById("type-breakdown-card");
  if (element) element.hidden = !visible;
};

export const renderEmptyState = (message, options = {}) => {
  const isFredy = options.activeTeam === "F";
  const emptyMetrics = {
    statusCounts: {
      [MIGRATION_STATUS.pending]: 0,
      [MIGRATION_STATUS.inProcess]: 0,
      [MIGRATION_STATUS.validating]: 0,
      [MIGRATION_STATUS.done]: 0,
    },
    hoursByResponsible: { Jorge: 0, Johan: 0, Fredy: 0 },
    typeCounts: {},
    breakdownByType: {},
  };
  updateStats({ total: 0, totalHours: 0, avgHours: 0, balance: 0 });
  updateKpis(emptyMetrics, { activeTeam: options.activeTeam || "ALL", fredyMetrics: emptyMetrics });
  updateTeamCards(
    {
      totalHours: 0,
      hoursByResponsible: { Jorge: 0, Johan: 0, Fredy: 0 },
      countsByResponsible: { Jorge: 0, Johan: 0, Fredy: 0 },
    },
    { activeTeam: options.activeTeam || "ALL" }
  );
  renderEmptyChart("#chart-status", message);
  renderEmptyChart("#chart-responsables", message);
  renderEmptyChart("#chart-acumulado", message);
  renderEmptyChart("#chart-jorge-weekly", message);
  renderEmptyChart("#chart-Johan-weekly", message);
  setRecoveriesChartVisibility(!isFredy);
  setChartTitle("chart-status-title", isFredy ? "Estados Fredy" : "Estado migración");
  setChartTitle("chart-responsables-title", isFredy ? "Procesos por estado Fredy" : "Horas por responsable");
  setChartTitle("chart-acumulado-title", isFredy ? "Estados por mes" : "Acumulado de horas");
  setTypeBreakdownVisibility(!isFredy);
  renderTable([], options);
  renderDistributionTable([]);
  renderTypeBreakdownTable({});
  renderHistoryTable([]);
  renderWeeklySchedule([]);
};

export const renderDashboard = (processes, options = {}) => {
  if (!processes.length) {
    renderEmptyState("Sin datos para mostrar", options);
    return;
  }

  const statusMode = options.statusMode || "migration";
  const statusLabels = options.statusLabels;
  const metrics = computeMetrics(processes, { statusMode });
  const fredyMetrics = computeMetrics(processes, { statusMode: "fredy" });
  const isFredy = options.activeTeam === "F";
  updateStats(metrics);
  updateKpis(metrics, { activeTeam: options.activeTeam || "ALL", fredyMetrics });
  updateTeamCards(metrics, { activeTeam: options.activeTeam || "ALL" });
  renderStatusChart(metrics.statusCounts, statusLabels);
  setRecoveriesChartVisibility(!isFredy);

  if (isFredy) {
    setChartTitle("chart-status-title", "Estados Fredy");
    setChartTitle("chart-responsables-title", "Procesos por estado Fredy");
    setChartTitle("chart-acumulado-title", "Estados por mes");
    renderStatusBarChart(metrics.statusCounts, statusLabels);
    renderMonthlyStatusChart(options.scheduleEntries || [], statusLabels);
    renderEmptyChart("#chart-jorge-weekly", "");
    renderEmptyChart("#chart-Johan-weekly", "");
  } else {
    setChartTitle("chart-status-title", "Estado migración");
    setChartTitle("chart-responsables-title", "Horas por responsable");
    setChartTitle("chart-acumulado-title", "Acumulado de horas");
    renderResponsibleChart(metrics.hoursByResponsible, metrics.responsibles);
    renderLineChart(buildLineSeries(processes, metrics.responsibles));
  }
  renderTypeBreakdownTable(metrics.breakdownByType);
  setTypeBreakdownVisibility(!isFredy);

  const comparisons = buildWeeklyComparison(options.scheduleEntries || [], processes, ["Jorge", "Johan"]);
  if (!isFredy) {
    renderWeeklyComparisonChart("#chart-jorge-weekly", comparisons.find((item) => item.person === "Jorge"));
    renderWeeklyComparisonChart("#chart-Johan-weekly", comparisons.find((item) => item.person === "Johan"));
  }

  renderWeeklySchedule(options.scheduleEntries || [], { mode: options.scheduleMode || "week" });

  renderTable(processes, {
    statusMode: options.statusMode || "migration",
    statusLabels: options.statusLabels,
  });
  renderDistributionTable(processes);
  renderHistoryTable(options.historyEvents || []);
};
