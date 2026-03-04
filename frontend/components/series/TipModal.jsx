"use client";

import React, { useState, useCallback } from "react";
import { useWalletStore } from "../../store/useWalletStore";
import { apiPost } from "../../lib/apiClient";
import { trackEvent } from "../../lib/trackEvent";

const TipModal = React.memo(({ open, seriesId, seriesTitle, authorName, onClose }) => {
  const { paidPts, bonusPts, loadWallet } = useWalletStore();
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [result, setResult] = useState(null);

  const presetAmounts = [10, 50, 100, 500, 1000];
  const totalPts = paidPts + bonusPts;

  const handleTip = useCallback(async () => {
    const amount = selectedAmount === "custom"
      ? parseInt(customAmount, 10)
      : selectedAmount;

    if (!amount || amount <= 0) {
      setResult({ success: false, message: "Please select a tip amount" });
      return;
    }

    if (amount > totalPts) {
      setResult({ success: false, message: "Not enough POINTS" });
      return;
    }

    setIsWorking(true);
    trackEvent("tip_start", { seriesId, amount });

    try {
      const response = await apiPost("/api/tip", {
        seriesId,
        amount,
        message: message.trim(),
      });

      if (response.ok) {
        trackEvent("tip_success", { seriesId, amount });
        setResult({
          success: true,
          message: `Tipped ${amount} POINTS! Thank you for supporting the creator!`,
        });
        loadWallet();
        setTimeout(() => {
          onClose();
          setResult(null);
          setSelectedAmount(null);
          setCustomAmount("");
          setMessage("");
        }, 2000);
      } else {
        trackEvent("tip_fail", { seriesId, amount, error: response.error });
        setResult({
          success: false,
          message: response.error || "Tip failed, please try again",
        });
      }
    } catch (error) {
      trackEvent("tip_error", { seriesId, amount, error: error.message });
      setResult({
        success: false,
        message: "Tip failed, please try again",
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
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Tip the Creator</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
            aria-label="Close"
          >
            鉁?          </button>
        </div>

        <div className="mb-6 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
          <div className="text-sm text-neutral-400">Series</div>
          <div className="mt-1 font-semibold text-white">{seriesTitle}</div>
          {authorName && (
            <>
              <div className="mt-2 text-sm text-neutral-400">Author</div>
              <div className="mt-1 text-sm text-neutral-300">{authorName}</div>
            </>
          )}
        </div>

        <div className="mb-4 rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm">
          <span className="text-neutral-400">Balance: </span>
          <span className="ml-2 font-semibold text-emerald-400">{totalPts} POINTS</span>
        </div>

        <div className="mb-4">
          <div className="mb-3 text-sm font-medium text-neutral-300">Select Amount</div>
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
                {amount} PTS
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-2 text-sm font-medium text-neutral-300">Or enter custom amount</div>
          <input
            type="number"
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
              setSelectedAmount("custom");
            }}
            placeholder="Enter POINTS amount"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-300 focus:border-emerald-500 focus:outline-none"
            min="1"
          />
        </div>

        <div className="mb-6">
          <div className="mb-2 text-sm font-medium text-neutral-300">
            Message (optional)
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Leave a message for the creator..."
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-300 focus:border-emerald-500 focus:outline-none"
            rows="3"
            maxLength="200"
          />
          <div className="mt-1 text-right text-xs text-neutral-500">
            {message.length}/200
          </div>
        </div>

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

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
            disabled={isWorking}
          >
            Cancel
          </button>
          <button
            onClick={handleTip}
            disabled={isWorking || !selectedAmount}
            className="flex-1 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isWorking ? "Processing..." : "Confirm Tip"}
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-400">
          馃挕 Your tip directly supports the creator. Thank you for your generosity!
        </div>
      </div>
    </div>
  );
});

TipModal.displayName = "TipModal";

export default TipModal;
