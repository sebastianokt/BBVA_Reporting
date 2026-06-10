import { GOOGLE_APPS_SCRIPT_URL } from "../config/constants.js";

const isConfigured = () => {
  return GOOGLE_APPS_SCRIPT_URL && GOOGLE_APPS_SCRIPT_URL !== "URL_DEL_WEB_APP";
};

export const mergeProcessComments = (processes = [], commentsByProcessId = {}) => {
  return processes.map((process) => {
    const processId = String(process.processId || "").trim();
    const comment = processId ? commentsByProcessId[processId] : null;
    return {
      ...process,
      comments: comment?.comments || "",
      commentUpdatedAt: comment?.updatedAt || "",
      commentUserName: comment?.userName || "",
    };
  });
};

export const saveProcessComment = async ({ processId, comments, userName }) => {
  const cleanProcessId = String(processId || "").trim();
  if (!cleanProcessId) throw new Error("ID_PROCESO requerido");
  if (!isConfigured()) throw new Error("Configura GOOGLE_APPS_SCRIPT_URL");

  const payload = {
    processId: cleanProcessId,
    comments: String(comments ?? ""),
    userName: userName || "local",
    updatedAt: new Date().toISOString(),
  };

  const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`Apps Script ${response.status}`);
  const data = await response.json();
  if (data?.ok === false) throw new Error(data.error || "No se pudo guardar");
  return data?.comment || payload;
};
