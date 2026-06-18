export const LOCAL_EXCEL_FILE_NAME = "assets/data/procesos-migracion-propia.xlsx";
export const GOOGLE_SHEET_ID = "12OjE-5Vj3fUekTlS3x_7dBFlr-85PeqkKZSfiNJsGsE";
export const GOOGLE_SHEET_XLSX_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=xlsx`;
export const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxX3gU92eyRQiCbWtl7JpRMAZYlavpflBq8ARRT8blNJIjzelZuLfBn7rEHy1HsMgmM/exec";
export const DEFAULT_FILE_NAME = GOOGLE_SHEET_XLSX_URL;
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

export const FREDY_STATUS = {
  notStarted: "No ha iniciado la migracion",
  missingInputs: "Falta insumos",
  inputsDelivered: "Insumos entregados",
  inputComments: "Comentarios insumos",
  missingInputApproval: "Falta VoBo de insumos",
  missingProcessApproval: "Falta VoBo migración",
  migrating: "Migrando",
  done: "Ya migrado",
};

export const FREDY_RESPONSIBILITY = {
  recoveries: "recoveries",
  fredy: "fredy",
};

export const STATUS_LABELS = [
  MIGRATION_STATUS.done,
  MIGRATION_STATUS.validating,
  MIGRATION_STATUS.inProcess,
  MIGRATION_STATUS.pending,
];

export const FREDY_STATUS_LABELS = [
  FREDY_STATUS.notStarted,
  FREDY_STATUS.missingInputs,
  FREDY_STATUS.inputsDelivered,
  FREDY_STATUS.inputComments,
  FREDY_STATUS.missingInputApproval,
  FREDY_STATUS.missingProcessApproval,
  FREDY_STATUS.migrating,
  FREDY_STATUS.done,
];

export const FREDY_RECOVERIES_STATUS_LABELS = [
  FREDY_STATUS.missingInputs,
  FREDY_STATUS.inputComments,
  FREDY_STATUS.missingInputApproval,
  FREDY_STATUS.missingProcessApproval,
];

export const FREDY_OWNER_STATUS_LABELS = [
  FREDY_STATUS.notStarted,
  FREDY_STATUS.inputsDelivered,
  FREDY_STATUS.migrating,
  FREDY_STATUS.done,
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
