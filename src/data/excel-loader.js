import { DEFAULT_FILE_NAME } from "../config/constants.js";
import { normalizeKey } from "./migration-rules.js";
import { parseCommentsWorksheet, parseFredyWorksheet, parseScheduleWorksheet, parseWorksheet } from "./process-parser.js";

const findSheetName = (workbook, candidates) => {
  const normalizedCandidates = candidates.map((candidate) => normalizeKey(candidate));
  return workbook.SheetNames.find((sheetName) =>
    normalizedCandidates.includes(normalizeKey(sheetName))
  );
};

const parseWorkbook = (data, type) => {
  const workbook = XLSX.read(data, { type });
  const processSheetName = findSheetName(workbook, ["Hoja 1"]) || workbook.SheetNames[0];
  const scheduleSheetName = findSheetName(workbook, ["Cronograma"]);
  const fredySheetName = findSheetName(workbook, ["Fredy"]);
  const commentsSheetName = findSheetName(workbook, ["Comentarios"]);

  const processResult = parseWorksheet(workbook.Sheets[processSheetName]);
  const scheduleResult = parseScheduleWorksheet(
    scheduleSheetName ? workbook.Sheets[scheduleSheetName] : null,
    processResult.processes
  );
  const commentsResult = parseCommentsWorksheet(
    commentsSheetName ? workbook.Sheets[commentsSheetName] : null
  );
  const fredyResult = parseFredyWorksheet(
    fredySheetName ? workbook.Sheets[fredySheetName] : null,
    processResult.processes
  );

  return {
    processes: processResult.processes,
    scheduleEntries: scheduleResult.scheduleEntries,
    fredyEntries: fredyResult.fredyEntries,
    commentsByProcessId: commentsResult.commentsByProcessId,
    warnings: [
      ...processResult.warnings,
      ...scheduleResult.warnings,
      ...fredyResult.warnings,
      ...commentsResult.warnings,
    ],
  };
};

export const loadFromFile = async (file) => {
  const data = await file.arrayBuffer();
  return parseWorkbook(data, "array");
};

export const loadFromUrl = async (url = DEFAULT_FILE_NAME) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Fuente no disponible (${response.status})`);
  const data = await response.arrayBuffer();
  return parseWorkbook(data, "array");
};

export { DEFAULT_FILE_NAME };
