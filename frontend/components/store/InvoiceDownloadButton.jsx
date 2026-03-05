"use client";

import React, { useState, useCallback } from "react";

/**
 * NOTE: cleaned corrupted comment.
 * NOTE: cleaned corrupted comment.
 */
const InvoiceDownloadButton = React.memo(({ order, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [format, setFormat] = useState("pdf");

  // 閼颁胶甯囧▔銊╁櫞閿涙氨鏁撻幋鎬璂F閸欐垹銈?
  const generatePDF = useCallback((order) => {
    // NOTE: cleaned corrupted comment.
    const content = `
INVOICE
Order ID: ${order.id}
Date: ${order.date}
Amount: $${order.amount}

Items:
${order.items?.map((item) => `- ${item.name}: $${item.price}`).join("\n")}

Total: $${order.amount}
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    return blob;
  }, []);

  // 閼颁胶甯囧▔銊╁櫞閿涙氨鏁撻幋鎬孲V閸欐垹銈?
  const generateCSV = useCallback((order) => {
    // NOTE: cleaned corrupted comment.
    const headers = "Order ID,Date,Item,Price,Total\n";
    const rows =
      order.items
        ?.map(
          (item) =>
            `${order.id},${order.date},${item.name},${item.price},${order.amount}`
        )
        .join("\n") || "";

    const content = headers + rows;
    const blob = new Blob([content], { type: "text/csv" });
    return blob;
  }, []);

  // 閼颁胶甯囧▔銊╁櫞閿涙矮绗呮潪钘夊絺缁?
  const handleDownload = useCallback(async () => {
    setDownloading(true);

    try {
      // 閼颁胶甯囧▔銊╁櫞閿涙碍膩閹风喍绗呮潪钘夋鏉?
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 閼颁胶甯囧▔銊╁櫞閿涙氨鏁撻幋鎰絺缁併劍鏋冩禒?
      const blob =
        format === "pdf" ? generatePDF(order) : generateCSV(order);

      // 閼颁胶甯囧▔銊╁櫞閿涙艾鍨卞杞扮瑓鏉炰粙鎽奸幒?
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${order.id}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsOpen(false);
    } catch (error) {
      console.error("Failed to download invoice:", error);
      alert("Failed to download invoice. Please try again.");
    } finally {
      setDownloading(false);
    }
  }, [format, order, generatePDF, generateCSV]);

  return (
    <>
      {/* 閼颁胶甯囧▔銊╁櫞閿涙矮绗呮潪鑺ュ瘻闁?*/}
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 ${className}`}
        aria-label="Download Invoice"
      >
        <span>DL</span>
        <span>Download Invoice</span>
      </button>

      {/* 閼颁胶甯囧▔銊╁櫞閿涙矮绗呮潪钘夎剨缁?*/}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => !downloading && setIsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 閼颁胶甯囧▔銊╁櫞閿涙碍鐖ｆ０?*/}
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                Download Invoice
              </h3>
              <button
                onClick={() => !downloading && setIsOpen(false)}
                disabled={downloading}
                className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white disabled:opacity-50"
                aria-label="Close"
              >
                閴?              </button>
            </div>

            {/* 閼颁胶甯囧▔銊╁櫞閿涙俺顓归崡鏇氫繆閹?*/}
            <div className="mb-6 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-neutral-400">Order ID</span>
                <span className="font-mono text-white">{order.id}</span>
              </div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-neutral-400">Date</span>
                <span className="text-white">{order.date}</span>
              </div>
              <div className="flex items-center justify-between border-t border-neutral-800 pt-2">
                <span className="text-sm text-neutral-400">Total Amount</span>
                <span className="text-lg font-bold text-emerald-400">
                  ${order.amount}
                </span>
              </div>
            </div>

            {/* 閼颁胶甯囧▔銊╁櫞閿涙碍鐗稿蹇涒偓澶嬪 */}
            <div className="mb-6">
              <label className="mb-3 block text-sm font-medium text-neutral-300">
                Select Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFormat("pdf")}
                  disabled={downloading}
                  className={`rounded-xl border p-4 text-center transition-all disabled:opacity-50 ${
                    format === "pdf"
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-neutral-800 bg-neutral-900/50 hover:border-neutral-700"
                  }`}
                >
                  <div className="mb-2 text-2xl">棣冩憙</div>
                  <div className="text-sm font-semibold text-white">PDF</div>
                  <div className="text-xs text-neutral-400">
                    Printable format
                  </div>
                </button>
                <button
                  onClick={() => setFormat("csv")}
                  disabled={downloading}
                  className={`rounded-xl border p-4 text-center transition-all disabled:opacity-50 ${
                    format === "csv"
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-neutral-800 bg-neutral-900/50 hover:border-neutral-700"
                  }`}
                >
                  <div className="mb-2 text-2xl">棣冩惓</div>
                  <div className="text-sm font-semibold text-white">CSV</div>
                  <div className="text-xs text-neutral-400">
                    Spreadsheet format
                  </div>
                </button>
              </div>
            </div>

            {/* 閼颁胶甯囧▔銊╁櫞閿涙矮绗呮潪鑺ュ瘻闁?*/}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full rounded-lg bg-emerald-500 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
            >
              {downloading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  Generating {format.toUpperCase()}...
                </span>
              ) : (
                `Download ${format.toUpperCase()}`
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
});

InvoiceDownloadButton.displayName = "InvoiceDownloadButton";

export default InvoiceDownloadButton;
