function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// Prevent spreadsheet formulas from untrusted description/category fields.
export function safeCell(v: unknown) {
  const s = String(v ?? "");
  return /^[\s]*[=+@-]/.test(s) ? "'" + s : s;
}
export async function exportRows(
  format: string,
  rows: any[],
  currency: string,
  title = "Daybook transactions",
) {
  const columns = [
    "Date",
    "Type",
    "Description",
    "Category",
    "Account",
    "Payment method",
    "Merchant",
    "Source",
    "Tags",
    "Notes",
    "Currency",
    "Amount",
  ];
  const data = rows.map((r) => [
    r.date,
    r.type,
    r.description,
    r.category,
    r.account,
    r.paymentMethod,
    r.merchant,
    r.source,
    r.tags?.join(", "),
    r.notes,
    currency,
    r.amount,
  ]);
  const name = title.toLowerCase().replaceAll(" ", "-");
  if (format === "csv") {
    const quote = (x: unknown) => '"' + safeCell(x).replaceAll('"', '""') + '"';
    download(
      new Blob(
        [
          "\uFEFF" +
            [columns, ...data].map((r) => r.map(quote).join(",")).join("\r\n"),
        ],
        { type: "text/csv;charset=utf-8" },
      ),
      name + ".csv",
    );
  } else if (format === "xlsx") {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Transactions");
    sheet.addRow(columns);
    data.forEach((r) =>
      sheet.addRow(
        r.map((v: any) => (typeof v === "number" ? v : safeCell(v))),
      ),
    );
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0C3134" },
    };
    sheet.columns.forEach((c) => (c.width = 20));
    sheet.getColumn(12).numFmt = "#,##0.00";
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    download(
      new Blob([(await workbook.xlsx.writeBuffer()) as ArrayBuffer]),
      name + ".xlsx",
    );
  } else {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(18);
    doc.text(title + " (" + currency + ")", 14, 18);
    autoTable(doc, {
      head: [columns.slice(0, 6).concat("Amount")],
      body: data.map((r) => r.slice(0, 6).concat(r[11])),
      startY: 25,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [12, 49, 52] },
    });
    doc.save(name + ".pdf");
  }
}
