import { FREDY_OWNER_STATUS_LABELS, FREDY_RECOVERIES_STATUS_LABELS, STATUS_LABELS } from "../config/constants.js";
import { displayResponsible, displayStatus, escapeHtml } from "../services/format.js";

const chartInstances = new Map();
const DEFAULT_COLORS = ["#00a878", "#3b82f6", "#0ea5e9", "#f59e0b", "#8b5cf6", "#14b8a6", "#64748b", "#ef4444"];

const getStatusColors = (labels = []) =>
  labels.map((label, index) => {
    if (FREDY_RECOVERIES_STATUS_LABELS.includes(label)) return "#f59e0b";
    if (FREDY_OWNER_STATUS_LABELS.includes(label)) return "#0ea5a4";
    return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  });

const clearChart = (id) => {
  if (chartInstances.has(id)) {
    chartInstances.get(id).destroy();
    chartInstances.delete(id);
  }
  const container = document.querySelector(id);
  if (container) container.innerHTML = "";
};

export const renderEmptyChart = (id, message) => {
  const container = document.querySelector(id);
  if (!container) return;
  container.innerHTML = `<div class="chart-empty">${escapeHtml(message)}</div>`;
};

export const renderStatusChart = (statusCounts, statusLabels = STATUS_LABELS) => {
  const containerId = "#chart-status";
  clearChart(containerId);

  const labels = statusLabels.filter((label) => statusCounts[label] !== undefined);
  const series = labels.map((label) => statusCounts[label] || 0);

  if (!series.length || series.every((value) => value === 0)) {
    renderEmptyChart(containerId, "Sin datos de estado");
    return;
  }

  const chart = new ApexCharts(document.querySelector(containerId), {
    chart: { type: "donut", height: 260, fontFamily: "Plus Jakarta Sans, sans-serif" },
    labels: labels.map(displayStatus),
    series,
    colors: getStatusColors(labels),
    legend: { position: "bottom", markers: { radius: 12 } },
    dataLabels: { enabled: true },
    stroke: { colors: ["#ffffff"], width: 2 },
  });

  chart.render();
  chartInstances.set(containerId, chart);
};

export const renderResponsibleChart = (hoursByResponsible, responsibles) => {
  const containerId = "#chart-responsables";
  clearChart(containerId);

  const chart = new ApexCharts(document.querySelector(containerId), {
    chart: {
      type: "bar",
      height: 260,
      fontFamily: "Plus Jakarta Sans, sans-serif",
      toolbar: { show: false },
    },
    series: [{ name: "Horas", data: responsibles.map((name) => Number((hoursByResponsible[name] || 0).toFixed(2))) }],
    colors: ["#004481", "#49a5e6", "#f59e0b"],
    plotOptions: { bar: { borderRadius: 10, columnWidth: "45%", distributed: true } },
    xaxis: { categories: responsibles.map(displayResponsible), labels: { style: { colors: "#6b7a99" } } },
    yaxis: { labels: { style: { colors: "#6b7a99" } } },
    grid: { borderColor: "#e4e9f0", strokeDashArray: 6 },
  });

  chart.render();
  chartInstances.set(containerId, chart);
};

export const renderStatusBarChart = (statusCounts, statusLabels = STATUS_LABELS) => {
  const containerId = "#chart-responsables";
  clearChart(containerId);

  const labels = statusLabels.filter((label) => statusCounts[label] !== undefined);
  const series = labels.map((label) => statusCounts[label] || 0);

  if (!series.length || series.every((value) => value === 0)) {
    renderEmptyChart(containerId, "Sin datos de estado");
    return;
  }

  const chart = new ApexCharts(document.querySelector(containerId), {
    chart: {
      type: "bar",
      height: 280,
      fontFamily: "Plus Jakarta Sans, sans-serif",
      toolbar: { show: false },
    },
    series: [{ name: "Procesos", data: series }],
    colors: getStatusColors(labels),
    plotOptions: { bar: { borderRadius: 8, horizontal: true, distributed: true } },
    xaxis: {
      categories: labels.map(displayStatus),
      labels: { style: { colors: "#6b7a99" } },
    },
    yaxis: { labels: { style: { colors: "#344767" } } },
    grid: { borderColor: "#e4e9f0", strokeDashArray: 6 },
    dataLabels: { enabled: true },
  });

  chart.render();
  chartInstances.set(containerId, chart);
};

export const renderLineChart = (series) => {
  const containerId = "#chart-acumulado";
  clearChart(containerId);

  if (!series.some((item) => item.data.length)) {
    renderEmptyChart(containerId, "Sin datos para línea acumulada");
    return;
  }

  const chart = new ApexCharts(document.querySelector(containerId), {
    chart: {
      type: "line",
      height: 260,
      fontFamily: "Plus Jakarta Sans, sans-serif",
      toolbar: { show: false },
    },
    series,
    colors: ["#004481", "#49a5e6"],
    stroke: { curve: "smooth", width: 3 },
    markers: { size: 0 },
    xaxis: {
      type: "numeric",
      title: { text: "Orden de proceso" },
      labels: { style: { colors: "#6b7a99" } },
    },
    yaxis: {
      title: { text: "Horas acumuladas" },
      labels: { style: { colors: "#6b7a99" } },
    },
    grid: { borderColor: "#e4e9f0", strokeDashArray: 6 },
  });

  chart.render();
  chartInstances.set(containerId, chart);
};

export const renderMonthlyStatusChart = (entries = [], statusLabels = STATUS_LABELS) => {
  const containerId = "#chart-acumulado";
  clearChart(containerId);

  const months = Array.from(
    new Map(
      entries
        .filter((entry) => entry.monthKey)
        .map((entry) => [entry.monthKey, entry])
    ).values()
  ).sort((a, b) => (a.monthOrder || 9999) - (b.monthOrder || 9999) || String(a.month).localeCompare(String(b.month)));

  if (!months.length) {
    renderEmptyChart(containerId, "Sin meses para graficar");
    return;
  }

  const series = statusLabels.map((status) => ({
    name: displayStatus(status),
    data: months.map((month) =>
      entries.filter((entry) => {
        const entryStatus = entry.linkedProcess?.fredyStatus || entry.status || statusLabels[0] || "";
        return entry.monthKey === month.monthKey && entryStatus === status;
      }).length
    ),
  })).filter((serie) => serie.data.some((value) => value > 0));

  if (!series.length) {
    renderEmptyChart(containerId, "Sin estados de Fredy para graficar");
    return;
  }

  const chart = new ApexCharts(document.querySelector(containerId), {
    chart: {
      type: "bar",
      height: 280,
      stacked: true,
      fontFamily: "Plus Jakarta Sans, sans-serif",
      toolbar: { show: false },
    },
    series,
    colors: getStatusColors(series.map((serie) => serie.name)),
    plotOptions: { bar: { borderRadius: 6, columnWidth: "48%" } },
    xaxis: {
      categories: months.map((month) => month.month || month.monthKey),
      labels: { style: { colors: "#6b7a99" } },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      title: { text: "Procesos" },
      labels: { style: { colors: "#6b7a99" } },
    },
    legend: { position: "bottom" },
    grid: { borderColor: "#e4e9f0", strokeDashArray: 6 },
  });

  chart.render();
  chartInstances.set(containerId, chart);
};

export const renderWeeklyComparisonChart = (containerId, comparison) => {
  clearChart(containerId);
  const container = document.querySelector(containerId);
  if (!container) return;

  if (!comparison || !comparison.weeks.length) {
    renderEmptyChart(containerId, "Sin semanas planificadas");
    return;
  }

  const hasData = comparison.series.some((serie) => serie.data.some((value) => value > 0));
  if (!hasData) {
    renderEmptyChart(containerId, "Sin datos para comparar");
    return;
  }

  const chart = new ApexCharts(container, {
    chart: {
      type: "line",
      height: 280,
      fontFamily: "Plus Jakarta Sans, sans-serif",
      toolbar: { show: false },
    },
    series: comparison.series,
    colors: ["#004481", "#f59e0b", "#00a878"],
    stroke: { curve: "smooth", width: 3 },
    markers: { size: 4 },
    xaxis: {
      categories: comparison.weeks.map((week) => `Semana ${week}`),
      labels: { style: { colors: "#6b7a99" } },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      title: { text: "Procesos" },
      labels: { style: { colors: "#6b7a99" } },
    },
    legend: { position: "bottom" },
    grid: { borderColor: "#e4e9f0", strokeDashArray: 6 },
  });

  chart.render();
  chartInstances.set(containerId, chart);
};
