"use client";

import { memo, useEffect, useState } from "react";
import { X, LogIn, Sparkles, Gift, BookOpen } from "lucide-react";
const LoginPrompt = memo(function LoginPrompt({
  isOpen = false,
  onClose,
  eyebrow = "Member access",
  title = "Sign in to continue",
  message = "Unlock all features and start your reading journey!",
  returnTo = "/",
  primaryLabel = "Sign In",
  secondaryLabel = "Create Account",
  features = [
    { icon: BookOpen, text: "Save your reading progress" },
    { icon: Gift, text: "Claim daily rewards and bonus points" },
    { icon: Sparkles, text: "Personalized recommendations" },
  ],
  showFeatures = true,
}) {
  const [isAnimating, setIsAnimating] = useState(false);

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

  const handleLogin = () => {
    handleClose();
    setTimeout(() => {
      const event = new CustomEvent("auth:open", {
        detail: { returnTo },
      });
      window.dispatchEvent(event);
    }, 300);
  };

  const handleSignup = () => {
    handleClose();
    setTimeout(() => {
      const event = new CustomEvent("auth:open", {
        detail: { returnTo, mode: "register" },
      });
      window.dispatchEvent(event);
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
      className={`fixed inset-0 z-[9999] flex items-end justify-center p-0 transition-all duration-300 sm:items-center sm:p-4 ${
        isAnimating ? "bg-black/60 backdrop-blur-sm" : "bg-black/0"
      }`}
      onClick={handleClose}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div
        onClick={handleContentClick}
        className={`relative w-full border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.98))] shadow-[0_34px_90px_rgba(15,23,42,0.18)] transition-all duration-300 sm:max-w-md sm:rounded-3xl ${
          isAnimating
            ? "translate-y-0 opacity-100 scale-100"
            : "translate-y-full sm:translate-y-0 opacity-0 sm:scale-95"
        }`}
        style={{
          borderTopLeftRadius: "1.5rem",
          borderTopRightRadius: "1.5rem",
        }}
      >
        <div className="flex justify-center pt-3 pb-2 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-black/12" />
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 text-slate-400 transition-all duration-300 hover:bg-black/5 hover:text-slate-700 active:scale-95"
          aria-label="Close sign-in prompt"
        >
          <X size={20} />
        </button>

        <div className="p-6 sm:p-8">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,245,239,0.98))] text-slate-950 shadow-[0_18px_36px_rgba(15,23,42,0.07)]">
              <LogIn size={32} />
            </div>
          </div>

          <div className="mb-6 text-center">
            {eyebrow ? (
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
              {title}
            </h2>
            {message ? (
              <p className="text-sm leading-7 text-slate-600">{message}</p>
            ) : null}
          </div>

          {showFeatures && features.length > 0 && (
            <div className="mb-6 space-y-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-[20px] border border-black/6 bg-white/84 p-3.5 shadow-[0_12px_26px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[rgba(0,113,227,0.08)] text-[var(--gush-accent-strong,#0058cc)]">
                      <Icon size={20} />
                    </div>
                    <p className="text-sm text-slate-600">{feature.text}</p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleLogin}
              className="w-full min-h-[48px] rounded-full bg-slate-950 px-6 py-3 text-base font-semibold text-white transition-all duration-300 hover:bg-slate-800 active:scale-[0.98]"
            >
              {primaryLabel}
            </button>
            <button
              type="button"
              onClick={handleSignup}
              className="w-full min-h-[48px] rounded-full border border-black/8 bg-white px-6 py-3 text-base font-medium text-slate-700 transition-all duration-300 hover:border-black/12 hover:bg-[#f8f9fc] active:scale-[0.98]"
            >
              {secondaryLabel}
            </button>
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
});

export default LoginPrompt;
