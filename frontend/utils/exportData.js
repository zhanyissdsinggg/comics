// Data export helpers (CSV / JSON)

/**
 * Export records as CSV.
 */
export function exportToCSV(data, headers, filename) {
  const rows = data.map((row) =>
    headers.map((h) => `"${String(row[h.key] || "").replace(/"/g, '""')}"`).join(",")
  );

  const csvContent = [headers.map((h) => h.label).join(","), ...rows].join("\n");
  downloadFile(
    new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" }),
    `${filename}_${getDateString()}.csv`
  );
}

/**
 * Export records as JSON.
 */
export function exportToJSON(data, filename) {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(new Blob([jsonContent], { type: "application/json" }), `${filename}_${getDateString()}.json`);
}

function downloadFile(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function getDateString() {
  return new Date().toISOString().split("T")[0];
}
