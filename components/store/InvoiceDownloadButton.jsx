"use client";

import React, { useState, useCallback } from "react";

/**
 * 老王注释：发票下载按钮组件
 * 功能：支持下载PDF和CSV格式的发票
 * 遵循KISS原则：简洁的下载流程
 * 遵循DRY原则：统一的下载逻辑
 */
const InvoiceDownloadButton = React.memo(({ order, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [format, setFormat] = useState("pdf");

  // 老王注释：生成PDF发票
  const generatePDF = useCallback((order) => {
    // 老王注释：实际项目中应该调用后端API生成PDF
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

  // 老王注释：生成CSV发票
  const generateCSV = useCallback((order) => {
    // 老王注释：实际项目中应该调用后端API生成CSV
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

  // 老王注释：下载发票
  const handleDownload = useCallback(async () => {
    setDownloading(true);

    try {
      // 老王注释：模拟下载延迟
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 老王注释：生成发票文件
      const blob =
        format === "pdf" ? generatePDF(order) : generateCSV(order);

      // 老王注释：创建下载链接
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${order.id}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // 老王注释：关闭弹窗
      setIsOpen(false);
    } catch (error) {
      console.error("艹，下载发票失败:", error);
      alert("Failed to download invoice. Please try again.");
    } finally {
      setDownloading(false);
    }
  }, [format, order, generatePDF, generateCSV]);

  return (
    <>
      {/* 老王注释：下载按钮 */}
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 ${className}`}
        aria-label="Download Invoice"
      >
        <span>📄</span>
        <span>Download Invoice</span>
      </button>

      {/* 老王注释：下载弹窗 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => !downloading && setIsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 老王注释：标题 */}
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
                ✕
              </button>
            </div>

            {/* 老王注释：订单信息 */}
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

            {/* 老王注释：格式选择 */}
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
                  <div className="mb-2 text-2xl">📕</div>
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
                  <div className="mb-2 text-2xl">📊</div>
                  <div className="text-sm font-semibold text-white">CSV</div>
                  <div className="text-xs text-neutral-400">
                    Spreadsheet format
                  </div>
                </button>
              </div>
            </div>

            {/* 老王注释：下载按钮 */}
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
