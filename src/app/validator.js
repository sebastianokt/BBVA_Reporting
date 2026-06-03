import { loadValidationRuns, recordValidationRun } from "../services/storage.js";
import { escapeHtml } from "../services/format.js";

const baseFont = "Plus Jakarta Sans, sans-serif";

const defaultLog = [
  ["01/06/2026", "Identificacion de campos de entrada", "Exitosa", "142 campos identificados"],
  ["01/06/2026", "Validacion de campos nulos de entrada", "Con observaciones", "57 campos con valores nulos"],
  ["01/06/2026", "Identificacion de campos de salida", "Pendiente", "33 de 66 campos revisados"],
  ["01/06/2026", "Validacion de reglas de salida", "Exitosa", "14 de 14 reglas verificadas"],
  ["01/06/2026", "Revision de documentacion funcional", "Exitosa", "Completada"],
  ["01/06/2026", "Registro de hallazgos", "Con observaciones", "Pendientes de correccion identificados"],
];

const renderRadialChart = (selector, label, color) => {
  const element = document.querySelector(selector);
  if (!element) return;
  element.innerHTML = "";

  const chart = new ApexCharts(element, {
    chart: { type: "radialBar", height: 240, fontFamily: baseFont },
    series: [100],
    labels: [label],
    colors: [color],
    plotOptions: {
      radialBar: {
        dataLabels: {
          name: { fontSize: "0.8rem" },
          value: { fontSize: "1.6rem", fontWeight: 700 },
        },
      },
    },
  });
  chart.render();
};

const renderStatusChart = (runs = []) => {
  const element = document.querySelector("#motor-chart-status");
  if (!element) return;
  element.innerHTML = "";
  const statusCounts = runs.reduce(
    (counts, run) => {
      const status = run.status || "Pendiente";
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    },
    { Exitosa: 0, Fallida: 0, Pendiente: 0, "Con observaciones": 0 }
  );

  const chart = new ApexCharts(element, {
    chart: { type: "donut", height: 240, fontFamily: baseFont },
    series: [
      statusCounts.Exitosa,
      statusCounts.Fallida,
      statusCounts.Pendiente,
      statusCounts["Con observaciones"],
    ],
    labels: ["Exitosas", "Fallidas", "Pendientes", "Con observaciones"],
    colors: ["#00a878", "#dc2626", "#f59e0b", "#3b82f6"],
    legend: { position: "bottom" },
  });
  chart.render();
};

const renderLog = () => {
  const tbody = document.getElementById("validator-log-body");
  if (!tbody) return;
  tbody.innerHTML = defaultLog
    .map(([date, activity, status, result]) => `
      <tr>
        <td>${escapeHtml(date)}</td>
        <td>${escapeHtml(activity)}</td>
        <td><span class="tag-pill ${status === "Exitosa" ? "tag-done" : status === "Pendiente" ? "tag-pending" : "tag-validating"}">${escapeHtml(status)}</span></td>
        <td>${escapeHtml(result)}</td>
      </tr>
    `)
    .join("");
};

const renderHistory = (runs = []) => {
  const tbody = document.getElementById("validation-history-body");
  const currentStatus = document.getElementById("validator-current-status");
  if (currentStatus) currentStatus.textContent = runs[0]?.status || "Completado";
  if (!tbody) return;
  if (!runs.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-muted">Sin ejecuciones registradas.</td></tr>';
    return;
  }
  tbody.innerHTML = runs
    .map((run) => `
      <tr>
        <td>${escapeHtml(new Date(run.executedAt || run.executed_at || Date.now()).toLocaleString("es-CO"))}</td>
        <td>${escapeHtml(run.validationName || run.validation_name || "-")}</td>
        <td>${escapeHtml(run.status || "-")}</td>
        <td>${escapeHtml(run.summary || "-")}</td>
        <td>${escapeHtml(run.executedBy || run.executed_by || "-")}</td>
      </tr>
    `)
    .join("");
};

const loadAndRender = async () => {
  const runs = await loadValidationRuns();
  renderLog();
  renderRadialChart("#motor-chart-inputs", "Entradas", "#49a5e6");
  renderRadialChart("#motor-chart-outputs", "Salidas", "#f59e0b");
  renderStatusChart(runs);
  renderHistory(runs);
};

document.getElementById("record-validation-button")?.addEventListener("click", async () => {
  await recordValidationRun({
    validationName: "Validador motor",
    status: "Con observaciones",
    summary: "Ejecucion registrada desde la pantalla del validador.",
    executedBy: localStorage.getItem("dashboard-user") || "local",
    results: defaultLog.map(([date, activity, status, result]) => ({
      itemReference: date,
      status,
      message: activity,
      observations: result,
    })),
  });
  await loadAndRender();
});

loadAndRender();
