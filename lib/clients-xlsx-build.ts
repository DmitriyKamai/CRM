/**
 * Сборка XLSX только для Node/API (использует Buffer).
 */

export async function buildClientsXlsxBuffer(
  headers: string[],
  rows: string[][]
): Promise<Buffer> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Клиенты", {
    views: [{ state: "frozen", ySplit: 1 }]
  });
  ws.addRow(headers);
  for (const r of rows) {
    ws.addRow(r);
  }
  ws.getRow(1).font = { bold: true };
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
