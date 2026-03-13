"use client";

import { memo, useState, useEffect } from "react";
import { Wallet, Sparkles, Zap, Gift, X } from "lucide-react";
const WalletTopUpPrompt = memo(function WalletTopUpPrompt({
  isOpen = false,
  onClose,
  currentPoints = 0,
  onTopUp
}) {
  const [isAnimating, setIsAnimating] = useState(false);

  const packages = [
    {
      id: "starter",
      points: 100,
      price: "$4.99",
      bonus: 0,
      popular: false
    },
    {
      id: "popular",
      points: 500,
      price: "$19.99",
      bonus: 50,
      popular: true
    },
    {
      id: "best",
      points: 1000,
      price: "$34.99",
      bonus: 150,
      popular: false
    }
  ];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsAnimating(true), 50);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const handleSelectPackage = (pkg) => {
    handleClose();
    setTimeout(() => {
      onTopUp?.(pkg);
    }, 300);
  };

  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300 ${
        isAnimating ? "bg-black/60 backdrop-blur-sm" : "bg-black/0"
      }`}
      onClick={handleClose}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div
        onClick={handleContentClick}
        className={`relative w-full sm:max-w-lg bg-neutral-900/95 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-300 sm:rounded-3xl ${
          isAnimating
            ? "translate-y-0 opacity-100 scale-100"
            : "translate-y-full sm:translate-y-0 opacity-0 sm:scale-95"
        }`}
        style={{
          borderTopLeftRadius: "1.5rem",
          borderTopRightRadius: "1.5rem"
        }}
      >
        <div className="flex justify-center pt-3 pb-2 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-neutral-700" />
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full p-2 text-neutral-400 transition-all duration-300 hover:bg-white/10 hover:text-white active:scale-95"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="p-6 sm:p-8">
          <div className="mb-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 text-emerald-400">
                <Wallet size={32} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Top Up Points</h2>
            <p className="text-sm text-neutral-400">
              Current balance: <span className="font-semibold text-emerald-400">{currentPoints} POINTS</span>
            </p>
          </div>

          <div className="mb-6 space-y-3">
            {packages.map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                onClick={() => handleSelectPackage(pkg)}
                className={`relative w-full rounded-2xl border p-4 text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                  pkg.popular
                    ? "border-emerald-500/50 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5"
                    : "border-neutral-800 bg-neutral-900/50 hover:border-neutral-700"
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-2 right-4 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                    POPULAR
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      pkg.popular ? "bg-emerald-500/20 text-emerald-400" : "bg-neutral-800 text-neutral-400"
                    }`}>
                      <Zap size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white">{pkg.points} POINTS</span>
                        {pkg.bonus > 0 && (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                            <Gift size={12} />
                            +{pkg.bonus}
                          </span>
                        )}
                      </div>
                      {pkg.bonus > 0 && (
                        <p className="text-xs text-neutral-400">
                          Total: {pkg.points + pkg.bonus} POINTS
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-white">{pkg.price}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-400 mb-1">
                  Special Offer!
                </p>
                <p className="text-xs text-neutral-400">
                  Get bonus POINTS with larger packages. The more you buy, the more you save!
                </p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-neutral-500">
            Secure payment powered by Stripe
          </p>
        </div>
      </div>
    </div>
  );
});

export default WalletTopUpPrompt;
