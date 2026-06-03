export const DEFAULT_FILE_NAME = "assets/data/procesos-migracion-propia.xlsx";
export const API_BASE_URL =
  typeof window !== "undefined" && window.location.protocol !== "file:"
    ? `${window.location.origin}/api`
    : "http://localhost:8000/api";

export const MIGRATION_STATUS = {
  pending: "Falta migrar",
  inProcess: "En proceso",
  validating: "Validando",
  done: "Ya se migro",
};

export const STATUS_LABELS = [
  MIGRATION_STATUS.done,
  MIGRATION_STATUS.validating,
  MIGRATION_STATUS.inProcess,
  MIGRATION_STATUS.pending,
];

export const RESPONSIBLE_ORDER = ["Jorge", "Johan", "Fredy"];
export const COMPARISON_PEOPLE = ["Jorge", "Johan"];

export const SCHEDULE_SETTINGS = {
  startDate: "2026-05-25",
  hoursPerDay: 7.5,
  daysPerWeek: 5,
};

export const STATUS_STORAGE_KEY = "migration-status-map";
export const HISTORY_STORAGE_KEY = "migration-history-events";
export const IMPORT_STORAGE_KEY = "migration-imports";
export const VALIDATION_STORAGE_KEY = "validation-runs";
