/**
 * Чтение XLSX в браузере и на сервере (exceljs вместо пакета xlsx).
 */

function cellToPlainString(val: unknown): string {
  if (val == null || val === "") return "";
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null && "text" in val) {
    return String((val as { text: string }).text);
  }
  if (
    typeof val === "object" &&
    val !== null &&
    "richText" in val &&
    Array.isArray((val as { richText: { text: string }[] }).richText)
  ) {
    return (val as { richText: { text: string }[] }).richText
      .map((t) => t.text)
      .join("");
  }
  if (typeof val === "object" && val !== null && "result" in val) {
    return cellToPlainString((val as { result: unknown }).result);
  }
  return String(val);
}

/** Первая вкладка → массив строк (как sheet_to_json header:1). */
export async function parseXlsxFirstSheetToAoA(buf: ArrayBuffer): Promise<string[][]> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const raw: string[][] = [];
  let maxCol = 0;

  ws.eachRow({ includeEmpty: true }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      while (cells.length < colNumber) cells.push("");
      cells[colNumber - 1] = cellToPlainString(cell.value);
    });
    maxCol = Math.max(maxCol, cells.length);
    raw.push(cells);
  });

  const padded = raw.map((r) => {
    const p = [...r];
    while (p.length < maxCol) p.push("");
    return p;
  });

  while (
    padded.length > 0 &&
    padded[padded.length - 1].every((x) => String(x).trim() === "")
  ) {
    padded.pop();
  }

  return padded;
}
