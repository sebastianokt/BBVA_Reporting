import { MIGRATION_STATUS } from "../config/constants.js";

export const normalizeKey = (value) => {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const parseNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined) return 0;
  const cleaned = String(value)
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^0-9.\-]/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const inferResponsible = (value) => {
  const normalized = normalizeKey(value);
  if (normalized.includes("jorge")) return "Jorge";
  if (normalized.includes("Johan")) return "Johan";
  return null;
};

export const normalizeTeam = (value) => {
  const normalized = normalizeKey(value);
  if (normalized.startsWith("r")) return "R";
  if (normalized.startsWith("f")) return "F";
  return null;
};

export const buildMigrationStatus = (rawValue) => {
  if (!rawValue) return MIGRATION_STATUS.pending;
  const normalized = normalizeKey(rawValue);
  if (["si", "s", "ok", "migrado", "migrada", "hecho", "listo", "ya", "1"].includes(normalized)) {
    return MIGRATION_STATUS.done;
  }
  return MIGRATION_STATUS.pending;
};

export const buildValidationStatus = (rawValue) => {
  if (!rawValue) return MIGRATION_STATUS.pending;
  const normalized = normalizeKey(rawValue);
  if (["si", "s", "ok", "validando", "ya", "x", "true", "verdadero","1"].includes(normalized)) {
    return MIGRATION_STATUS.validating;
  }
  return MIGRATION_STATUS.pending;
};

export const buildInProcessStatus = (rawValue) => {
  if (!rawValue) return MIGRATION_STATUS.pending;
  const normalized = normalizeKey(rawValue);
  if (["1", "si", "s", "ok", "x", "true", "verdadero", "en proceso"].includes(normalized)) {
    return MIGRATION_STATUS.inProcess;
  }
  return MIGRATION_STATUS.pending;
};
