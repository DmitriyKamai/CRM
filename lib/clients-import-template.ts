/** Скачивает пустой CSV с заголовками для импорта клиентов. */
export function downloadClientsImportTemplateCsv(columnLabels: string[], filename = "clients-template.csv") {
  try {
    const csv = `${columnLabels.join(",")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Failed to download template", err);
  }
}
