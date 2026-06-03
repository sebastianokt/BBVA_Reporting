export const displayResponsible = (name) =>
  name === "Johan" ? "Johan" : name;

export const displayStatus = (status) =>
  status === "Ya se migro" ? "Ya se migró" : status;

export const escapeHtml = (value) => {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const formatNumber = (value, digits = 1) => {
  if (!Number.isFinite(value)) return "0";
  return value.toFixed(digits);
};
