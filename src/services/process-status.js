import { GOOGLE_APPS_SCRIPT_URL } from "../config/constants.js";

const isConfigured = () => {
  return GOOGLE_APPS_SCRIPT_URL && GOOGLE_APPS_SCRIPT_URL !== "URL_DEL_WEB_APP";
};

export const saveProcessStatus = async ({ processId, status, statusScope = "migration", userName }) => {
  const cleanProcessId = String(processId || "").trim();
  if (!cleanProcessId) throw new Error("ID_PROCESO requerido");
  if (!isConfigured()) throw new Error("Configura GOOGLE_APPS_SCRIPT_URL");

  const payload = {
    action: "status",
    processId: cleanProcessId,
    status,
    statusScope,
    userName: userName || "local",
    updatedAt: new Date().toISOString(),
  };

  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`Apps Script ${response.status}`);
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (data?.ok === false) {
      const appError = new Error(data.error || "No se pudo guardar el estado");
      appError.fromAppsScript = true;
      throw appError;
    }
    return data?.process || payload;
  } catch (error) {
    if (error.fromAppsScript || String(error.message || "").startsWith("Apps Script")) throw error;
    await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    return payload;
  }
};
