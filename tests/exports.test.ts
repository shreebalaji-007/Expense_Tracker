import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { safeCell } from "../frontend/src/exports";
test("Excel export produces readable numeric cells and harmless formula-like strings", async () => {
  const w = new ExcelJS.Workbook();
  const s = w.addWorksheet("Transactions");
  s.addRow(["Description", "Amount"]);
  s.addRow([safeCell("=1+1"), 123.45]);
  const buffer = await w.xlsx.writeBuffer();
  assert.equal(Buffer.from(buffer).subarray(0, 2).toString(), "PK");
  const check = new ExcelJS.Workbook();
  await check.xlsx.load(buffer);
  assert.equal(check.worksheets[0].getCell("B2").value, 123.45);
  assert.equal(check.worksheets[0].getCell("A2").value, "'=1+1");
});
test("PDF report renders a table with the installed jsPDF version", () => {
  const doc = new jsPDF({ orientation: "landscape" });
  autoTable(doc, {
    head: [["Date", "Description", "Amount (INR)"]],
    body: [["2026-09-09", "Lunch", 350]],
  });
  assert.ok(doc.output().startsWith("%PDF-"));
  assert.ok(doc.getNumberOfPages() >= 1);
});
