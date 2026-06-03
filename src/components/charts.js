import { STATUS_LABELS } from "../config/constants.js";
import { displayResponsible, displayStatus, escapeHtml } from "../services/format.js";

const chartInstances = new Map();

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

export const renderStatusChart = (statusCounts) => {
  const containerId = "#chart-status";
  clearChart(containerId);

  const labels = STATUS_LABELS.filter((label) => statusCounts[label] !== undefined);
  const series = labels.map((label) => statusCounts[label] || 0);

  if (!series.length || series.every((value) => value === 0)) {
    renderEmptyChart(containerId, "Sin datos de estado");
    return;
  }

  const chart = new ApexCharts(document.querySelector(containerId), {
    chart: { type: "donut", height: 260, fontFamily: "Plus Jakarta Sans, sans-serif" },
    labels: labels.map(displayStatus),
    series,
    colors: ["#00a878", "#3b82f6", "#0ea5e9", "#f59e0b"],
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
