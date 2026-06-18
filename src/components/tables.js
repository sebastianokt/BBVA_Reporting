import { FREDY_RECOVERIES_STATUS_LABELS, MIGRATION_STATUS, STATUS_LABELS } from "../config/constants.js";
import { displayResponsible, displayStatus, escapeHtml, formatNumber } from "../services/format.js";
import { getProcessResponsible, getProcessStatus } from "../services/filters.js";

const getStatusClass = (status, statusMode = "migration") => {
  if (statusMode === "fredy") {
    return FREDY_RECOVERIES_STATUS_LABELS.includes(status) ? "tag-fredy-recoveries" : "tag-fredy-owner";
  }
  if (status === MIGRATION_STATUS.done || status === "Ya migrado") return "tag-done";
  if (status === MIGRATION_STATUS.validating || status.includes("VoBo")) return "tag-validating";
  if (status === MIGRATION_STATUS.inProcess || status.includes("entregados")) return "tag-in-process";
  return "tag-pending";
};

export const renderTable = (processes, options = {}) => {
  const tbody = document.getElementById("process-table-body");
  const countEl = document.getElementById("table-count");
  if (!tbody) return;
  const statusLabels = options.statusLabels || STATUS_LABELS;
  const statusMode = options.statusMode || "migration";

  tbody.innerHTML = processes
    .map((process) => {
      const status = getProcessStatus(process, statusMode) || MIGRATION_STATUS.pending;
      const statusClass = getStatusClass(status, statusMode);
      const statusOptions = statusLabels
        .map((label) => `
          <option value="${escapeHtml(label)}" ${status === label ? "selected" : ""}>${escapeHtml(displayStatus(label))}</option>
        `)
        .join("");
      const fredyDateControl = statusMode === "fredy"
        ? `
          <div class="fredy-date-control fredy-date-cell-control">
            <label class="fredy-date-label">Fecha pedida de insumos</label>
            <input
              class="fredy-date-input"
              data-process-id="${escapeHtml(process.processId || "")}"
              type="date"
              value="${escapeHtml(process.fredyStatusDate || "")}"
              ${process.processId ? "" : "disabled"}
            />
            <div class="fredy-date-actions">
              <button
                class="btn btn-outline-primary btn-sm fredy-date-save-button"
                type="button"
                data-process-id="${escapeHtml(process.processId || "")}"
                ${process.processId ? "" : "disabled"}
              >
                Guardar
              </button>
              <span class="comment-feedback text-muted"></span>
            </div>
          </div>
        `
        : "";

      return `
        <tr>
          <td>${escapeHtml(process.processId || "-")}</td>
          <td><strong>${escapeHtml(process.name)}</strong></td>
          <td>${escapeHtml(process.area || "-")}</td>
          <td>${escapeHtml(displayResponsible(getProcessResponsible(process)))}</td>
          <td>
            <div class="tag-pill ${statusClass}">${escapeHtml(displayStatus(status))}</div>
            <div style="margin-top:6px">
              <select
                class="status-select"
                data-key="${escapeHtml(process.key)}"
                data-process-id="${escapeHtml(process.processId || "")}"
                ${process.processId ? "" : "disabled"}
              >
                ${statusOptions}
              </select>
            </div>
          </td>
          <td>${fredyDateControl || '<span class="text-muted">-</span>'}</td>
          <td>
            <div class="comment-control">
              <textarea
                class="comment-input"
                data-process-id="${escapeHtml(process.processId || "")}"
                ${process.processId ? "" : "disabled"}
                rows="2"
                placeholder="${process.processId ? "Escribir novedad" : "Sin ID_PROCESO"}"
              >${escapeHtml(process.comments || "")}</textarea>
              <div class="comment-actions">
                <button
                  class="btn btn-outline-primary btn-sm comment-save-button"
                  type="button"
                  data-process-id="${escapeHtml(process.processId || "")}"
                  ${process.processId ? "" : "disabled"}
                >
                  Guardar
                </button>
                <span class="comment-feedback text-muted"></span>
              </div>
            </div>
          </td>
          <td><strong>${formatNumber(process.hours, 1)}h</strong></td>
          <td>${formatNumber(process.factor, 1)}</td>
          <td>${formatNumber(process.score, 1)}</td>
          <td>${formatNumber(process.lineas, 0)}</td>
          <td>${formatNumber(process.scripts, 0)}</td>
          <td>${escapeHtml(process.talla || "-")}</td>
        </tr>
      `;
    })
    .join("");

  if (countEl) countEl.textContent = `${processes.length} procesos visibles`;
};

export const renderDistributionTable = (processes) => {
  const tbody = document.getElementById("dist-tbody");
  if (!tbody) return;

  tbody.innerHTML = processes
    .slice()
    .sort((a, b) => a.assignedTo.localeCompare(b.assignedTo))
    .map((process) => {
      const status = process.migrationStatus || MIGRATION_STATUS.pending;
      return `
        <tr>
          <td><strong>${escapeHtml(process.name)}</strong></td>
          <td>${escapeHtml(displayResponsible(process.assignedTo))}</td>
          <td><strong>${formatNumber(process.hours, 1)}h</strong></td>
          <td>${escapeHtml(displayStatus(status))}</td>
        </tr>
      `;
    })
    .join("");
};

export const renderTypeBreakdownTable = (breakdownByType = {}) => {
  const tbody = document.getElementById("type-breakdown-body");
  if (!tbody) return;

  const rows = Object.entries(breakdownByType).sort(([a], [b]) => a.localeCompare(b));
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-muted">Sin datos por tipo.</td></tr>';
    return;
  }

  tbody.innerHTML = rows
    .map(([type, data]) => `
      <tr>
        <td><strong>${escapeHtml(type)}</strong></td>
        <td>${data.total}</td>
        <td>${formatNumber(data.hours, 1)}h</td>
        <td>${data.statusCounts[MIGRATION_STATUS.done] || 0}</td>
        <td>${data.statusCounts[MIGRATION_STATUS.inProcess] || 0}</td>
        <td>${data.statusCounts[MIGRATION_STATUS.validating] || 0}</td>
        <td>${data.statusCounts[MIGRATION_STATUS.pending] || 0}</td>
      </tr>
    `)
    .join("");
};

export const renderHistoryTable = (events = []) => {
  const tbody = document.getElementById("history-table-body");
  if (!tbody) return;

  if (!events.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-muted">Sin historial registrado.</td></tr>';
    return;
  }

  tbody.innerHTML = events
    .slice(0, 100)
    .map((event) => `
      <tr>
        <td>${escapeHtml(new Date(event.createdAt || event.created_at || Date.now()).toLocaleString("es-CO"))}</td>
        <td>${escapeHtml(event.entityType || event.entity_type || "-")}</td>
        <td>${escapeHtml(event.entityId || event.entity_id || "-")}</td>
        <td>${escapeHtml(event.eventType || event.event_type || "-")}</td>
        <td>${escapeHtml(event.fieldName || event.field_name || "-")}</td>
        <td>${escapeHtml(event.oldValue ?? event.old_value ?? "")}</td>
        <td>${escapeHtml(event.newValue ?? event.new_value ?? "")}</td>
      </tr>
    `)
    .join("");
};
