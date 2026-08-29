"use client";

import { ReactNode, useMemo, useState } from "react";
import { Check, Copy, Download, X } from "@/lib/icons";
import { useToast } from "@/components/toast-provider";

type ExportColumn<Row> = {
  label: string;
  value: (row: Row) => string | number | null | undefined;
};

type BulkSelectionRenderProps<Row> = {
  selectedIds: ReadonlySet<string>;
  HeaderSelector: () => ReactNode;
  RowSelector: ({ row }: { row: Row }) => ReactNode;
  actionBar: ReactNode;
};

function csvCell(value: string | number | null | undefined) {
  const normalized = value == null ? "" : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, header: readonly string[], rows: readonly (readonly (string | number | null | undefined)[])[]) {
  const content = [header.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function WorkspaceTableBulkActions<Row>({
  rows,
  rowId,
  rowLabel,
  exportColumns,
  filename,
  hrefForRow,
  children,
}: {
  rows: readonly Row[];
  rowId: (row: Row) => string;
  rowLabel: (row: Row) => string;
  exportColumns: readonly ExportColumn<Row>[];
  filename: string;
  hrefForRow?: (row: Row) => string | null;
  children: (props: BulkSelectionRenderProps<Row>) => ReactNode;
}) {
  const toast = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const selectedRows = useMemo(() => rows.filter((row) => selectedIds.has(rowId(row))), [rowId, rows, selectedIds]);
  const selectableLinks = useMemo(
    () => hrefForRow ? selectedRows.map(hrefForRow).filter((href): href is string => Boolean(href)) : [],
    [hrefForRow, selectedRows],
  );

  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(rowId(row)));
  const someSelected = !allSelected && selectedRows.length > 0;
  const toggleAll = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (rows.length > 0 && rows.every((row) => next.has(rowId(row)))) rows.forEach((row) => next.delete(rowId(row)));
      else rows.forEach((row) => next.add(rowId(row)));
      return next;
    });
  };
  const toggleRow = (row: Row) => {
    const id = rowId(row);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const exportSelected = () => {
    downloadCsv(filename, exportColumns.map((column) => column.label), selectedRows.map((row) => exportColumns.map((column) => column.value(row))));
    toast.success(`${selectedRows.length} selected record${selectedRows.length === 1 ? "" : "s"} exported.`);
  };
  const copyLinks = async () => {
    if (!selectableLinks.length) return;
    const links = selectableLinks.map((href) => new URL(href, window.location.origin).toString()).join("\n");
    try {
      await navigator.clipboard.writeText(links);
      toast.success(`${selectableLinks.length} record link${selectableLinks.length === 1 ? "" : "s"} copied.`);
    } catch {
      toast.error("Couldn’t copy links", "Your browser did not allow clipboard access.");
    }
  };

  const HeaderSelector = () => <button type="button" role="checkbox" aria-checked={someSelected ? "mixed" : allSelected} aria-label="Select all visible rows" className={`workspace-bulk-header-selector is-${allSelected ? "all" : someSelected ? "some" : "none"}`} onClick={toggleAll}>{someSelected ? <span>−</span> : allSelected ? <Check size={11} strokeWidth={3} /> : null}</button>;
  const RowSelector = ({ row }: { row: Row }) => {
    const checked = selectedIds.has(rowId(row));
    return <button type="button" role="checkbox" aria-checked={checked} aria-label={`${checked ? "Deselect" : "Select"} ${rowLabel(row)}`} className={`workspace-bulk-row-selector${checked ? " is-checked" : ""}`} onClick={(event) => { event.stopPropagation(); toggleRow(row); }}><Check size={11} strokeWidth={3} /></button>;
  };
  const actionBar = selectedRows.length ? <div className="workspace-bulk-action-bar" role="region" aria-label="Bulk actions"><strong>{selectedRows.length}</strong><span>{selectedRows.length === 1 ? "record" : "records"} selected</span><div><button type="button" onClick={exportSelected}><Download size={14} /> Export</button>{selectableLinks.length ? <button type="button" onClick={() => void copyLinks()}><Copy size={14} /> Copy links</button> : null}<button type="button" className="workspace-bulk-clear" onClick={() => setSelectedIds(new Set())} aria-label="Clear selection"><X size={15} /></button></div></div> : null;

  return <>{children({ selectedIds, HeaderSelector, RowSelector, actionBar })}</>;
}
