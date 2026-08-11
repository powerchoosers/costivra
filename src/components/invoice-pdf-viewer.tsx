"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Minus, Plus } from "@/lib/icons";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function InvoicePdfViewer({ sourceUrl, filename }: { sourceUrl: string; filename: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!frame.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width - 48)));
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="invoice-pdf" aria-label={`Source PDF: ${filename}`}>
      <header className="invoice-pdf-toolbar">
        <div>
          <strong>{filename}</strong>
          <small>{pages ? `Page ${page} of ${pages}` : "Loading source…"}</small>
        </div>
        <nav aria-label="PDF controls">
          <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} aria-label="Previous page"><ChevronLeft size={16} /></button>
          <button type="button" onClick={() => setPage((value) => Math.min(pages || 1, value + 1))} disabled={!pages || page >= pages} aria-label="Next page"><ChevronRight size={16} /></button>
          <span className="invoice-pdf-divider" />
          <button type="button" onClick={() => setScale((value) => Math.max(0.7, value - 0.1))} aria-label="Zoom out"><Minus size={16} /></button>
          <span className="invoice-pdf-zoom">{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => setScale((value) => Math.min(1.7, value + 0.1))} aria-label="Zoom in"><Plus size={16} /></button>
          <a href={sourceUrl} download={filename} aria-label="Download source PDF"><Download size={16} /></a>
        </nav>
      </header>
      <div className="invoice-pdf-canvas" ref={frame}>
        <Document
          file={sourceUrl}
          onLoadSuccess={({ numPages }) => { setPages(numPages); setPage((value) => Math.min(value, numPages)); }}
          loading={<div className="invoice-pdf-state">Preparing the secure document viewer…</div>}
          error={<div className="invoice-pdf-state invoice-pdf-state--error">This PDF could not be displayed. <a href={sourceUrl}>Download the source file</a>.</div>}
        >
          <Page pageNumber={page} width={width * scale} renderTextLayer renderAnnotationLayer />
        </Document>
      </div>
    </section>
  );
}
