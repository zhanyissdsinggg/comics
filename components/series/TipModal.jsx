"use client";

import React, { useState, useCallback } from "react";
import { useWalletStore } from "../../store/useWalletStore";
import { apiPost } from "../../lib/apiClient";
import { track } from "../../lib/analytics";

/**
 * 老王注释：打赏弹窗组件
 * 功能：允许用户打赏作者
 * 遵循KISS原则：简洁的打赏界面
 * 遵循DRY原则：复用钱包逻辑
 */
const TipModal = React.memo(({ open, seriesId, seriesTitle, authorName, onClose }) => {
  const { paidPts, bonusPts, loadWallet } = useWalletStore();
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [result, setResult] = useState(null);

  // 老王注释：预设打赏金额
  const presetAmounts = [10, 50, 100, 500, 1000];

  const totalPts = paidPts + bonusPts;

  // 老王注释：处理打赏
  const handleTip = useCallback(async () => {
    const amount = selectedAmount === "custom"
      ? parseInt(customAmount, 10)
      : selectedAmount;

    if (!amount || amount <= 0) {
      setResult({ success: false, message: "请选择打赏金额" });
      return;
    }

    if (amount > totalPts) {
      setResult({ success: false, message: "积分不足" });
      return;
    }

    setIsWorking(true);
    track("tip_start", { seriesId, amount });

    try {
      const response = await apiPost("/api/tip", {
        seriesId,
        amount,
        message: message.trim(),
      });

      if (response.ok) {
        track("tip_success", { seriesId, amount });
        setResult({
          success: true,
          message: `成功打赏 ${amount} 积分！感谢你对作者的支持！`,
        });
        loadWallet(); // 刷新钱包
        setTimeout(() => {
          onClose();
          setResult(null);
          setSelectedAmount(null);
          setCustomAmount("");
          setMessage("");
        }, 2000);
      } else {
        track("tip_fail", { seriesId, amount, error: response.error });
        setResult({
          success: false,
          message: response.error || "打赏失败，请重试",
        });
      }
    } catch (error) {
      track("tip_error", { seriesId, amount, error: error.message });
      setResult({
        success: false,
        message: "打赏失败，请重试",
      });
    } finally {
      setIsWorking(false);
    }
  }, [seriesId, selectedAmount, customAmount, message, totalPts, loadWallet, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 老王注释：标题 */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">打赏作者</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        {/* 老王注释：作品信息 */}
        <div className="mb-6 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
          <div className="text-sm text-neutral-400">作品</div>
          <div className="mt-1 font-semibold text-white">{seriesTitle}</div>
          {authorName && (
            <>
              <div className="mt-2 text-sm text-neutral-400">作者</div>
              <div className="mt-1 text-sm text-neutral-300">{authorName}</div>
            </>
          )}
        </div>

        {/* 老王注释：钱包余额 */}
        <div className="mb-4 rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm">
          <span className="text-neutral-400">当前余额：</span>
          <span className="ml-2 font-semibold text-emerald-400">{totalPts} 积分</span>
        </div>

        {/* 老王注释：预设金额 */}
        <div className="mb-4">
          <div className="mb-3 text-sm font-medium text-neutral-300">选择金额</div>
          <div className="grid grid-cols-3 gap-2">
            {presetAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => {
                  setSelectedAmount(amount);
                  setCustomAmount("");
                }}
                className={`rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                  selectedAmount === amount
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700"
                }`}
              >
                {amount} 积分
              </button>
            ))}
          </div>
        </div>

        {/* 老王注释：自定义金额 */}
        <div className="mb-4">
          <div className="mb-2 text-sm font-medium text-neutral-300">或输入自定义金额</div>
          <input
            type="number"
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
              setSelectedAmount("custom");
            }}
            placeholder="输入积分数量"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-300 focus:border-emerald-500 focus:outline-none"
            min="1"
          />
        </div>

        {/* 老王注释：留言 */}
        <div className="mb-6">
          <div className="mb-2 text-sm font-medium text-neutral-300">
            留言（可选）
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="给作者留言..."
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-300 focus:border-emerald-500 focus:outline-none"
            rows="3"
            maxLength="200"
          />
          <div className="mt-1 text-right text-xs text-neutral-500">
            {message.length}/200
          </div>
        </div>

        {/* 老王注释：结果提示 */}
        {result && (
          <div
            className={`mb-4 rounded-xl border p-3 text-sm ${
              result.success
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/20 bg-red-500/10 text-red-400"
            }`}
          >
            {result.message}
          </div>
        )}

        {/* 老王注释：操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
            disabled={isWorking}
          >
            取消
          </button>
          <button
            onClick={handleTip}
            disabled={isWorking || !selectedAmount}
            className="flex-1 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isWorking ? "处理中..." : "确认打赏"}
          </button>
        </div>

        {/* 老王注释：提示信息 */}
        <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-400">
          💡 打赏将直接支持作者创作，感谢你的慷慨！
        </div>
      </div>
    </div>
  );
});

TipModal.displayName = "TipModal";

export default TipModal;
