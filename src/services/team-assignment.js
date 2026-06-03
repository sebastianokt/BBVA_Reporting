import { MIGRATION_STATUS } from "../config/constants.js";
import { inferResponsible, normalizeKey } from "../data/migration-rules.js";

export const assignByHours = (processes) => {
  const totals = {
    Jorge: 0,
    Sebastian: 0,
  };

  const fixed = [];
  const pending = [];

  processes.forEach((process) => {
    if (process.team === "F") {
      process.assignedTo = "Fredy";
      return;
    }
    if (Number.isInteger(process.fixedWeekIndex) && process.fixedWeekIndex >= 0) {
      fixed.push(process);
      return;
    }
    pending.push(process);
  });

  fixed.forEach((process) => {
    const normalizedName = normalizeKey(process.name);
    const isAsignacionIb =
      normalizedName.includes("asignacion ib") ||
      normalizedName.includes("asignacion_ib");

    let target;
    if (process.migrationStatus === MIGRATION_STATUS.done) {
      target = isAsignacionIb ? "Johan" : "Jorge";
    } else {
      const inferred = inferResponsible(process.usuario);
      target = inferred || (totals.Jorge <= totals.Johan ? "Jorge" : "Johan");
    }

    process.assignedTo = target;
    totals[target] += process.hours || 0;
  });

  const sortedPending = [...pending].sort((a, b) => b.hours - a.hours);
  sortedPending.forEach((process) => {
    const target = totals.Jorge <= totals.Johan ? "Jorge" : "Johan";
    process.assignedTo = target;
    totals[target] += process.hours || 0;
  });

  return totals;
};
