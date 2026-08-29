import ExcelJS from "exceljs";
import { deflateSync } from "node:zlib";
import type { PortalData } from "@/lib/portal/types";

type Column = {
  header: string;
  width?: number;
  numberFormat?: string;
};

type SheetDefinition = {
  name: string;
  columns: Column[];
  rows: Array<Array<string | number | Date | null>>;
};

const NAVY = "18253B";
const LIME = "C8F34A";
const PALE_BLUE = "EFF5FC";
const BORDER = "DCE4ED";
const MONEY_FORMAT = '$#,##0.00;[Red]($#,##0.00);-';

function safeText(value: unknown) {
  const text = value == null ? "" : String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function asDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? safeText(value) : date;
}

function formula(sumRange: string, result: number) {
  return { formula: `SUM(${sumRange})`, result };
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function categoryChartImage(items: Array<{ label: string; value: number }>) {
  const width = 560;
  const height = 210;
  const pixels = Buffer.alloc((width * 3 + 1) * height, 255);
  const setPixel = (x: number, y: number, red: number, green: number, blue: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const offset = y * (width * 3 + 1) + 1 + x * 3;
    pixels[offset] = red;
    pixels[offset + 1] = green;
    pixels[offset + 2] = blue;
  };
  for (let y = 0; y < height; y += 1) pixels[y * (width * 3 + 1)] = 0;
  const chartLeft = 34;
  const chartRight = width - 18;
  const chartTop = 16;
  const chartBottom = height - 26;
  for (let line = 0; line < 4; line += 1) {
    const y = chartTop + Math.round((chartBottom - chartTop) * line / 3);
    for (let x = chartLeft; x <= chartRight; x += 1) setPixel(x, y, 226, 232, 240);
  }
  const maximum = Math.max(...items.map((item) => item.value), 1);
  const gap = 14;
  const barWidth = Math.max(18, Math.floor((chartRight - chartLeft - gap * (items.length - 1)) / Math.max(items.length, 1)));
  items.forEach((item, index) => {
    const xStart = chartLeft + index * (barWidth + gap);
    const barHeight = Math.max(2, Math.round((item.value / maximum) * (chartBottom - chartTop)));
    for (let x = xStart; x < Math.min(chartRight, xStart + barWidth); x += 1) {
      for (let y = chartBottom - barHeight; y < chartBottom; y += 1) setPixel(x, y, 140, 187, 31);
    }
  });
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([signature, pngChunk("IHDR", header), pngChunk("IDAT", deflateSync(pixels)), pngChunk("IEND", Buffer.alloc(0))]);
}

function roundedMoney(values: Array<number | null | undefined>) {
  return Math.round(values.reduce<number>((total, value) => total + (value ?? 0), 0) * 100) / 100;
}

function addSheet(workbook: ExcelJS.Workbook, definition: SheetDefinition) {
  const sheet = workbook.addWorksheet(definition.name, {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }],
  });
  sheet.columns = definition.columns.map((column) => ({
    header: column.header,
    width: column.width ?? 18,
  }));
  sheet.addRows(definition.rows);
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, definition.rows.length + 1), column: definition.columns.length },
  };
  const header = sheet.getRow(1);
  header.height = 24;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${NAVY}` } };
    cell.alignment = { vertical: "middle" };
  });
  for (let columnIndex = 1; columnIndex <= definition.columns.length; columnIndex += 1) {
    const column = definition.columns[columnIndex - 1];
    if (column.numberFormat) sheet.getColumn(columnIndex).numFmt = column.numberFormat;
    sheet.getColumn(columnIndex).alignment = { vertical: "top", wrapText: true };
  }
  for (let rowIndex = 2; rowIndex <= definition.rows.length + 1; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    row.height = 20;
    row.eachCell((cell) => {
      cell.border = { bottom: { style: "hair", color: { argb: `FF${BORDER}` } } };
      cell.alignment = { vertical: "top", wrapText: true };
    });
  }
  return sheet;
}

function eachCell(sheet: ExcelJS.Worksheet, fromRow: number, toRow: number, fromColumn: number, toColumn: number, callback: (cell: ExcelJS.Cell) => void) {
  for (let row = fromRow; row <= toRow; row += 1) {
    for (let column = fromColumn; column <= toColumn; column += 1) callback(sheet.getCell(row, column));
  }
}

function buildSheets(data: PortalData): SheetDefinition[] {
  return [
    {
      name: "Vendors",
      columns: [
        { header: "Vendor", width: 28 }, { header: "Category", width: 18 }, { header: "Annualized spend", width: 18, numberFormat: MONEY_FORMAT }, { header: "Relationship status", width: 18 }, { header: "Cadence", width: 14 }, { header: "Website", width: 28 }, { header: "Updated", width: 16, numberFormat: "yyyy-mm-dd" },
      ],
      rows: data.vendors.map((item) => [safeText(item.name), safeText(item.category), item.annualizedSpend, safeText(item.relationshipStatus), safeText(item.spendCadence), safeText(item.website), asDate(item.updatedAt)]),
    },
    {
      name: "Expenses",
      columns: [
        { header: "Vendor", width: 28 }, { header: "Category", width: 18 }, { header: "Period start", width: 15, numberFormat: "yyyy-mm-dd" }, { header: "Period end", width: 15, numberFormat: "yyyy-mm-dd" }, { header: "Amount", width: 16, numberFormat: MONEY_FORMAT }, { header: "Prior period", width: 16, numberFormat: MONEY_FORMAT }, { header: "Status", width: 15 }, { header: "Location", width: 22 }, { header: "Updated", width: 16, numberFormat: "yyyy-mm-dd" },
      ],
      rows: data.expenses.map((item) => [safeText(item.vendorName), safeText(item.category), asDate(item.periodStart), asDate(item.periodEnd), item.amount, item.priorPeriodAmount, safeText(item.status), safeText(item.locationName), asDate(item.updatedAt)]),
    },
    {
      name: "Invoices",
      columns: [
        { header: "Vendor", width: 28 }, { header: "Invoice number", width: 20 }, { header: "Invoice date", width: 15, numberFormat: "yyyy-mm-dd" }, { header: "Due date", width: 15, numberFormat: "yyyy-mm-dd" }, { header: "Service period start", width: 18, numberFormat: "yyyy-mm-dd" }, { header: "Service period end", width: 18, numberFormat: "yyyy-mm-dd" }, { header: "Total amount", width: 16, numberFormat: MONEY_FORMAT }, { header: "Amount due", width: 16, numberFormat: MONEY_FORMAT }, { header: "Currency", width: 11 }, { header: "Review status", width: 17 }, { header: "Reconciliation", width: 18 }, { header: "Location", width: 22 }, { header: "Category", width: 18 },
      ],
      rows: data.invoices.map((item) => [safeText(item.vendorName), safeText(item.invoiceNumber), asDate(item.invoiceDate), asDate(item.dueDate), asDate(item.servicePeriodStart), asDate(item.servicePeriodEnd), item.totalAmount, item.amountDue, safeText(item.currency), safeText(item.reviewStatus), safeText(item.reconciliationStatus), safeText(item.locationName), safeText(item.expenseCategory)]),
    },
    {
      name: "Invoice lines",
      columns: [
        { header: "Invoice ID", width: 22 }, { header: "Line", width: 9 }, { header: "Description", width: 42 }, { header: "Category", width: 18 }, { header: "Quantity", width: 12, numberFormat: "#,##0.00" }, { header: "Unit price", width: 15, numberFormat: MONEY_FORMAT }, { header: "Amount", width: 15, numberFormat: MONEY_FORMAT }, { header: "Service period start", width: 18, numberFormat: "yyyy-mm-dd" }, { header: "Service period end", width: 18, numberFormat: "yyyy-mm-dd" },
      ],
      rows: data.invoiceLineItems.map((item) => [safeText(item.invoiceId), item.lineNumber, safeText(item.description), safeText(item.category), item.quantity, item.unitPrice, item.amount, asDate(item.servicePeriodStart), asDate(item.servicePeriodEnd)]),
    },
    {
      name: "Contracts",
      columns: [
        { header: "Vendor", width: 28 }, { header: "Contract", width: 34 }, { header: "Category", width: 18 }, { header: "Start date", width: 15, numberFormat: "yyyy-mm-dd" }, { header: "End date", width: 15, numberFormat: "yyyy-mm-dd" }, { header: "Annual value", width: 16, numberFormat: MONEY_FORMAT }, { header: "Status", width: 15 }, { header: "Auto renews", width: 13 }, { header: "Notice period (days)", width: 20 }, { header: "Location", width: 22 },
      ],
      rows: data.contracts.map((item) => [safeText(item.vendorName), safeText(item.title), safeText(item.category), asDate(item.startDate), asDate(item.endDate), item.annualValue, safeText(item.status), item.autoRenews ? "Yes" : "No", item.noticePeriodDays, safeText(item.locationName)]),
    },
    {
      name: "Opportunities",
      columns: [
        { header: "Title", width: 40 }, { header: "Vendor", width: 28 }, { header: "Category", width: 18 }, { header: "Status", width: 16 }, { header: "Priority", width: 12 }, { header: "Estimated annual value", width: 22, numberFormat: MONEY_FORMAT }, { header: "Estimate shown to workspace", width: 22 }, { header: "Confidence", width: 13, numberFormat: "0.0%" }, { header: "Deadline", width: 16, numberFormat: "yyyy-mm-dd" }, { header: "Evidence count", width: 15 }, { header: "Trust state", width: 18 }, { header: "Summary", width: 55 },
      ],
      rows: data.opportunities.map((item) => [safeText(item.title), safeText(item.vendorName), safeText(item.category), safeText(item.status), safeText(item.priority), item.estimatedAnnualValue, item.monetaryClaimAllowed ? "Yes" : "No", item.confidence == null ? null : item.confidence / 100, asDate(item.deadlineAt), item.evidenceCount, safeText(item.trustState), safeText(item.summary)]),
    },
    {
      name: "Actions",
      columns: [
        { header: "Action", width: 38 }, { header: "Vendor", width: 28 }, { header: "Priority", width: 12 }, { header: "Status", width: 16 }, { header: "Due date", width: 16, numberFormat: "yyyy-mm-dd" }, { header: "Required approvals", width: 18 }, { header: "Approved count", width: 16 }, { header: "Approval decision", width: 18 }, { header: "Description", width: 52 },
      ],
      rows: data.actions.map((item) => [safeText(item.title), safeText(item.vendorName), safeText(item.priority), safeText(item.status), asDate(item.dueAt), item.requiredApprovals, item.approvedCount, safeText(item.approvalDecision), safeText(item.description)]),
    },
    {
      name: "Savings outcomes",
      columns: [
        { header: "Outcome", width: 40 }, { header: "Value type", width: 18 }, { header: "Amount", width: 16, numberFormat: MONEY_FORMAT }, { header: "Status", width: 16 }, { header: "Verified at", width: 18, numberFormat: "yyyy-mm-dd" }, { header: "Method", width: 32 }, { header: "Baseline", width: 16, numberFormat: MONEY_FORMAT }, { header: "Comparison", width: 16, numberFormat: MONEY_FORMAT },
      ],
      rows: data.savings.map((item) => [safeText(item.title), safeText(item.valueType), item.amount, safeText(item.status), asDate(item.verifiedAt), safeText(item.method), item.baselineAmount, item.comparisonAmount]),
    },
    {
      name: "Locations",
      columns: [{ header: "Location", width: 28 }, { header: "Status", width: 15 }, { header: "Address", width: 48 }, { header: "Meter count", width: 14 }],
      rows: data.locations.map((item) => [safeText(item.name), safeText(item.status), safeText(item.address ? Object.values(item.address).filter(Boolean).join(", ") : null), item.meterCount]),
    },
    {
      name: "Expense accounts",
      columns: [{ header: "Account", width: 28 }, { header: "Reference", width: 20 }, { header: "Last four", width: 12 }, { header: "Category", width: 18 }, { header: "Status", width: 15 }, { header: "Location", width: 22 }, { header: "Service start", width: 16, numberFormat: "yyyy-mm-dd" }, { header: "Service end", width: 16, numberFormat: "yyyy-mm-dd" }],
      rows: data.expenseAccounts.map((item) => [safeText(item.accountName), safeText(item.externalAccountReference), safeText(item.accountNumberLast4), safeText(item.category), safeText(item.status), safeText(item.locationName), asDate(item.serviceStartDate), asDate(item.serviceEndDate)]),
    },
    {
      name: "Documents",
      columns: [{ header: "Vendor", width: 28 }, { header: "File name", width: 42 }, { header: "Document type", width: 18 }, { header: "Status", width: 16 }, { header: "Security status", width: 18 }, { header: "Extraction status", width: 18 }, { header: "Confidence", width: 13, numberFormat: "0.0%" }, { header: "Evidence count", width: 15 }, { header: "Created", width: 18, numberFormat: "yyyy-mm-dd" }],
      rows: data.documents.map((item) => [safeText(item.vendorName), safeText(item.originalFilename), safeText(item.documentType), safeText(item.status), safeText(item.securityStatus), safeText(item.extractionStatus), item.confidence == null ? null : item.confidence / 100, item.evidenceCount, asDate(item.createdAt)]),
    },
    {
      name: "Evidence",
      columns: [{ header: "Document ID", width: 22 }, { header: "Opportunity ID", width: 22 }, { header: "Page", width: 10 }, { header: "Field", width: 28 }, { header: "Source key", width: 22 }, { header: "Excerpt", width: 80 }],
      rows: data.evidenceReferences.map((item) => [safeText(item.documentId), safeText(item.opportunityId), item.pageNumber, safeText(item.fieldPath), safeText(item.sourceKey), safeText(item.textExcerpt)]),
    },
    {
      name: "Audit history",
      columns: [{ header: "Timestamp", width: 18, numberFormat: "yyyy-mm-dd hh:mm" }, { header: "Action", width: 32 }, { header: "Resource type", width: 22 }, { header: "Resource ID", width: 24 }, { header: "Actor type", width: 16 }, { header: "Actor", width: 26 }],
      rows: data.auditEvents.map((item) => [asDate(item.createdAt), safeText(item.action), safeText(item.resourceType), safeText(item.resourceId), safeText(item.actorType), safeText(item.actorName)]),
    },
    {
      name: "Workspace setup",
      columns: [{ header: "Area", width: 22 }, { header: "Name", width: 32 }, { header: "Status / role", width: 20 }, { header: "Details", width: 60 }],
      rows: [
        ...data.team.map((item) => ["Team member", safeText(item.fullName), safeText(item.role), safeText(item.email)]),
        ...data.approvalPolicies.map((item) => ["Approval policy", safeText(item.name), item.isActive ? "Active" : "Inactive", `${safeText(item.actionType)} · ${item.minimumApprovers} approver${item.minimumApprovers === 1 ? "" : "s"}`]),
        ...data.integrations.map((item) => ["Integration", safeText(item.displayName), safeText(item.status), safeText(item.description)]),
      ],
    },
  ];
}

export async function createAccountingWorkbook(data: PortalData, generatedAt: Date) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Costivra";
  workbook.created = generatedAt;
  workbook.modified = generatedAt;
  workbook.calcProperties.fullCalcOnLoad = true;

  const sheets = buildSheets(data);
  sheets.forEach((definition) => addSheet(workbook, definition));

  const reporting = workbook.addWorksheet("Reporting", { views: [{ showGridLines: false }] });
  reporting.mergeCells("A1:H1");
  reporting.getCell("A1").value = `${data.organization.name} — accounting workbook`;
  reporting.getCell("A1").font = { size: 18, bold: true, color: { argb: "FFFFFFFF" } };
  reporting.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${NAVY}` } };
  reporting.getCell("A1").alignment = { vertical: "middle" };
  reporting.getRow(1).height = 32;
  reporting.mergeCells("A2:H2");
  reporting.getCell("A2").value = `Generated ${generatedAt.toISOString().slice(0, 10)} · Point-in-time workspace export · Private source-file bytes are not included.`;
  reporting.getCell("A2").font = { color: { argb: "FF55657C" }, italic: true };
  reporting.getCell("A2").alignment = { wrapText: true, vertical: "middle" };
  reporting.getRow(2).height = 30;
  reporting.getRow(4).values = ["Key measure", "Current value"];
  eachCell(reporting, 4, 4, 1, 2, (cell) => {
    cell.font = { bold: true, color: { argb: "FF18253B" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${LIME}` } };
  });
  const vendorSpend = roundedMoney(data.vendors.map((item) => item.annualizedSpend));
  const invoiceTotal = roundedMoney(data.invoices.map((item) => item.totalAmount));
  const visibleEstimate = roundedMoney(data.opportunities.filter((item) => item.customerVisible && item.monetaryClaimAllowed).map((item) => item.estimatedAnnualValue));
  reporting.getCell("A5").value = "Monitored vendors";
  reporting.getCell("B5").value = { formula: `COUNTA('Vendors'!A2:A${Math.max(2, data.vendors.length + 1)})`, result: data.vendors.length };
  reporting.getCell("A6").value = "Annualized vendor spend";
  reporting.getCell("B6").value = formula(`'Vendors'!C2:C${Math.max(2, data.vendors.length + 1)}`, vendorSpend);
  reporting.getCell("A7").value = "Recorded invoice total";
  reporting.getCell("B7").value = formula(`'Invoices'!G2:G${Math.max(2, data.invoices.length + 1)}`, invoiceTotal);
  reporting.getCell("A8").value = "Visible estimated annual value (not verified)";
  reporting.getCell("B8").value = visibleEstimate;
  eachCell(reporting, 6, 8, 2, 2, (cell) => { cell.numFmt = MONEY_FORMAT; });
  eachCell(reporting, 5, 8, 1, 2, (cell) => { cell.border = { bottom: { style: "thin", color: { argb: `FF${BORDER}` } } }; });

  const categories = Array.from(new Set(data.vendors.map((item) => item.category).filter(Boolean))).sort((left, right) => left.localeCompare(right));
  reporting.getRow(4).getCell(4).value = "Spend by category";
  reporting.getRow(4).getCell(5).value = "Annualized spend";
  reporting.getRow(4).getCell(6).value = "Vendor count";
  eachCell(reporting, 4, 4, 4, 6, (cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${NAVY}` } };
  });
  categories.forEach((category, index) => {
    const row = index + 5;
    const categorySpend = roundedMoney(data.vendors.filter((item) => item.category === category).map((item) => item.annualizedSpend));
    reporting.getCell(`D${row}`).value = safeText(category);
    reporting.getCell(`E${row}`).value = formula(`SUMIF('Vendors'!B2:B${Math.max(2, data.vendors.length + 1)},D${row},'Vendors'!C2:C${Math.max(2, data.vendors.length + 1)})`, categorySpend);
    reporting.getCell(`F${row}`).value = { formula: `COUNTIF('Vendors'!B2:B${Math.max(2, data.vendors.length + 1)},D${row})`, result: data.vendors.filter((item) => item.category === category).length };
  });
  if (categories.length) {
    eachCell(reporting, 5, categories.length + 4, 5, 5, (cell) => { cell.numFmt = MONEY_FORMAT; });
  }
  reporting.getColumn(1).width = 42;
  reporting.getColumn(2).width = 20;
  reporting.getColumn(4).width = 26;
  reporting.getColumn(5).width = 20;
  reporting.getColumn(6).width = 14;
  const topCategories = categories.map((label) => ({ label, value: roundedMoney(data.vendors.filter((item) => item.category === label).map((item) => item.annualizedSpend)) })).sort((left, right) => right.value - left.value).slice(0, 6);
  if (topCategories.length) {
    const imageId = workbook.addImage({ base64: categoryChartImage(topCategories).toString("base64"), extension: "png" });
    reporting.addImage(imageId, { tl: { col: 3, row: 12 }, ext: { width: 560, height: 210 } });
    reporting.getCell("D12").value = "Top categories by annualized vendor spend";
    reporting.getCell("D12").font = { bold: true, color: { argb: `FF18253B` } };
  }
  reporting.mergeCells("A13:B17");
  reporting.getCell("A13").value = "How to use this workbook: begin on Reporting for operating totals and category concentration, then use the source tabs for vendor, expense, invoice, contract, opportunity, action, evidence, and audit detail. Estimated opportunity value is not verified savings and is labelled separately.";
  reporting.getCell("A13").alignment = { wrapText: true, vertical: "top" };
  reporting.getCell("A13").fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${PALE_BLUE}` } };
  reporting.getCell("A13").border = { bottom: { style: "thin", color: { argb: `FF${BORDER}` } }, top: { style: "thin", color: { argb: `FF${BORDER}` } }, left: { style: "thin", color: { argb: `FF${BORDER}` } }, right: { style: "thin", color: { argb: `FF${BORDER}` } } };

  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(output);
}
