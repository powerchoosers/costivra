"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeft, ChevronRight, Download, Minus, Plus, RotateCcw } from "@/lib/icons";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export interface BreakdownPdfViewerProps {
  sourceUrl: string;
  filename: string;
  initialPage?: number | null;
  onPageChange?: (page: number, totalPages: number) => void;
}

export default function BreakdownPdfViewer({
  sourceUrl,
  filename,
  initialPage,
  onPageChange,
}: BreakdownPdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(640);
  const [numPages, setNumPages] = useState<number>(0);
  const [activePage, setActivePage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Dynamically observe container width to adapt PDF page width to the split-pane
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const available = el.clientWidth;
      if (available > 100) {
        // Subtract padding (32px)
        setContainerWidth(Math.max(260, available - 36));
      }
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleDocumentLoadSuccess = useCallback(
    ({ numPages: count }: { numPages: number }) => {
      setNumPages(count);
      setLoadError(null);
      if (initialPage && initialPage >= 1 && initialPage <= count) {
        setActivePage(initialPage);
      }
      onPageChange?.(1, count);
    },
    [initialPage, onPageChange],
  );

  const handleDocumentLoadError = useCallback((error: Error) => {
    setLoadError(error.message || "Failed to load PDF preview.");
  }, []);

  // Scroll to a specific page when requested
  const scrollToPage = useCallback((pageNumber: number) => {
    if (pageNumber < 1 || !containerRef.current) return;
    const pageElement = document.getElementById(`breakdown-page-${pageNumber}`);
    if (pageElement && containerRef.current) {
      const containerTop = containerRef.current.getBoundingClientRect().top;
      const pageTop = pageElement.getBoundingClientRect().top;
      const scrollOffset = pageTop - containerTop + containerRef.current.scrollTop - 12;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      containerRef.current.scrollTo({ top: scrollOffset, behavior: reducedMotion ? "auto" : "smooth" });
      setActivePage(pageNumber);
    }
  }, []);

  useEffect(() => {
    if (initialPage && initialPage >= 1 && initialPage <= numPages) {
      scrollToPage(initialPage);
    }
  }, [initialPage, numPages, scrollToPage]);

  // Track currently visible page during continuous scrolling
  const handleScroll = useCallback(() => {
    if (!containerRef.current || numPages <= 1) return;
    const container = containerRef.current;
    const containerMid = container.scrollTop + container.clientHeight / 3;

    for (let p = 1; p <= numPages; p++) {
      const pageEl = document.getElementById(`breakdown-page-${p}`);
      if (pageEl) {
        const top = pageEl.offsetTop;
        const bottom = top + pageEl.offsetHeight;
        if (containerMid >= top && containerMid <= bottom) {
          setActivePage(p);
          onPageChange?.(p, numPages);
          break;
        }
      }
    }
  }, [numPages, onPageChange]);

  const zoomIn = () => setScale((s) => Math.min(2.0, Math.round((s + 0.15) * 100) / 100));
  const zoomOut = () => setScale((s) => Math.max(0.5, Math.round((s - 0.15) * 100) / 100));
  const resetZoom = () => setScale(1);

  return (
    <div className="breakdown-pdf-root">
      <div className="breakdown-pdf-toolbar">
        <div className="breakdown-pdf-page-indicator">
          {numPages > 0 ? (
            <>
              <button
                type="button"
                className="breakdown-pdf-tool-btn"
                onClick={() => scrollToPage(Math.max(1, activePage - 1))}
                disabled={activePage <= 1}
                title="Previous page"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              <span>
                Page <strong>{activePage}</strong> of <strong>{numPages}</strong>
              </span>
              <button
                type="button"
                className="breakdown-pdf-tool-btn"
                onClick={() => scrollToPage(Math.min(numPages, activePage + 1))}
                disabled={activePage >= numPages}
                title="Next page"
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </>
          ) : (
            <span>Loading pages…</span>
          )}
        </div>

        <div className="breakdown-pdf-zoom-controls">
          <button
            type="button"
            className="breakdown-pdf-tool-btn"
            onClick={zoomOut}
            disabled={scale <= 0.55}
            title="Zoom out"
            aria-label="Zoom out"
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            className="breakdown-pdf-zoom-label"
            onClick={resetZoom}
            title="Reset zoom to fit width"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            className="breakdown-pdf-tool-btn"
            onClick={zoomIn}
            disabled={scale >= 1.95}
            title="Zoom in"
            aria-label="Zoom in"
          >
            <Plus size={14} />
          </button>
          {scale !== 1 && (
            <button
              type="button"
              className="breakdown-pdf-tool-btn"
              onClick={resetZoom}
              title="Reset scale"
              aria-label="Reset scale"
            >
              <RotateCcw size={13} />
            </button>
          )}
          <a
            className="breakdown-pdf-tool-btn"
            href={sourceUrl}
            download={filename}
            title="Download original file"
            aria-label="Download original file"
          >
            <Download size={14} />
          </a>
        </div>
      </div>

      <div
        className="breakdown-pdf-scroll-container"
        ref={containerRef}
        onScroll={handleScroll}
      >
        <Document
          file={sourceUrl}
          onLoadSuccess={handleDocumentLoadSuccess}
          onLoadError={handleDocumentLoadError}
          loading={
            <div className="breakdown-pdf-loading">
              <div className="breakdown-pdf-loading-mark" aria-hidden="true"><span /><span /><span /></div>
              <div><strong>Preparing source view</strong><p>Rendering the protected original.</p></div>
            </div>
          }
          error={
            <div className="breakdown-pdf-error">
              <p>Could not render PDF preview canvas.</p>
              {loadError && <small>{loadError}</small>}
              <a href={sourceUrl} target="_blank" rel="noreferrer" className="breakdown-pdf-fallback-btn">
                <Download size={13} /> Download source file
              </a>
            </div>
          }
        >
          {numPages > 0 &&
            Array.from(new Array(numPages), (_, index) => {
              const pageNum = index + 1;
              return (
                <div
                  key={`page_${pageNum}`}
                  id={`breakdown-page-${pageNum}`}
                  className={`breakdown-pdf-page-card ${activePage === pageNum ? "is-active" : ""}`}
                >
                  <div className="breakdown-pdf-page-tag">Page {pageNum}</div>
                  <Page
                    pageNumber={pageNum}
                    width={containerWidth * scale}
                    renderTextLayer
                    renderAnnotationLayer
                  />
                </div>
              );
            })}
        </Document>
      </div>

      <style>{`
        .breakdown-pdf-root {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
          background: #020617;
        }
        .breakdown-pdf-toolbar {
          flex: 0 0 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(15, 23, 42, 0.94);
          font-size: 0.72rem;
          color: #94a3b8;
        }
        .breakdown-pdf-page-indicator {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .breakdown-pdf-page-indicator strong {
          color: #f8fafc;
          font-weight: 600;
        }
        .breakdown-pdf-zoom-controls {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .breakdown-pdf-tool-btn {
          width: 26px;
          height: 26px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.04);
          color: #cbd5e1;
          cursor: pointer;
          transition: color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
          text-decoration: none;
        }
        .breakdown-pdf-tool-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.2);
        }
        .breakdown-pdf-tool-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .breakdown-pdf-zoom-label {
          padding: 2px 7px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 6px;
          background: transparent;
          color: #cbd5e1;
          font-size: 0.68rem;
          font-weight: 600;
          cursor: pointer;
        }
        .breakdown-pdf-zoom-label:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
        }
        .breakdown-pdf-scroll-container {
          flex: 1 1 0%;
          min-height: 0;
          width: 100%;
          overflow-y: auto !important;
          overflow-x: auto !important;
          touch-action: pan-y;
          -webkit-overflow-scrolling: touch;
          padding: 16px 14px 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #020617;
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.4) rgba(15, 23, 42, 0.6);
        }
        .breakdown-pdf-scroll-container::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .breakdown-pdf-scroll-container::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.6);
        }
        .breakdown-pdf-scroll-container::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.35);
          border-radius: 999px;
        }
        .breakdown-pdf-scroll-container::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.55);
        }
        .breakdown-pdf-loading,
        .breakdown-pdf-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px 20px;
          color: #94a3b8;
          text-align: center;
        }
        .breakdown-pdf-loading strong { display: block; color: #e2e8f0; font-size: 0.78rem; }
        .breakdown-pdf-loading p { margin: 5px 0 0; font-size: 0.72rem; }
        .breakdown-pdf-loading-mark {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          height: 30px;
          padding: 0 11px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.48);
        }
        .breakdown-pdf-loading-mark span {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #94a3b8;
          animation: breakdownLoadingPulse 1.2s ease-in-out infinite;
        }
        .breakdown-pdf-loading-mark span:nth-child(2) { animation-delay: 0.16s; }
        .breakdown-pdf-loading-mark span:nth-child(3) { animation-delay: 0.32s; }
        @keyframes breakdownLoadingPulse {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-2px); }
        }
        .breakdown-pdf-fallback-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
          padding: 6px 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          color: #93c5fd;
          background: rgba(37, 99, 235, 0.14);
          font-size: 0.74rem;
          text-decoration: none;
        }
        .breakdown-pdf-page-card {
          position: relative;
          margin-bottom: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
          background: #fff;
          animation: breakdownPageEnter 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
        }
        .breakdown-pdf-page-card:last-child {
          margin-bottom: 0;
        }
        .breakdown-pdf-page-card.is-active {
          border-color: rgba(96, 165, 250, 0.4);
          box-shadow: 0 18px 46px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(96, 165, 250, 0.25);
        }
        .breakdown-pdf-page-tag {
          position: absolute;
          top: -10px;
          left: 12px;
          z-index: 10;
          padding: 2px 7px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 4px;
          background: #0f172a;
          color: #94a3b8;
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .breakdown-pdf-page-card.is-active .breakdown-pdf-page-tag {
          background: #1e3a8a;
          color: #bfdbfe;
          border-color: rgba(96, 165, 250, 0.4);
        }
        .breakdown-pdf-page-card .react-pdf__Page {
          display: block;
          overflow: hidden;
          border-radius: 5px;
        }
        .breakdown-pdf-page-card .react-pdf__Page canvas {
          display: block;
          max-width: 100%;
          height: auto !important;
        }
        @keyframes breakdownPageEnter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .breakdown-pdf-loading-mark span,
          .breakdown-pdf-page-card { animation: none; }
        }
      `}</style>
    </div>
  );
}
