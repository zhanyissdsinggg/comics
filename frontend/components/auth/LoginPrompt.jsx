"use client";

import { memo, useEffect, useState } from "react";
import { X, LogIn, Sparkles, Gift, BookOpen } from "lucide-react";
const LoginPrompt = memo(function LoginPrompt({
  isOpen = false,
  onClose,
  eyebrow = "Member access",
  title = "Sign in to continue",
  message = "Save your place and keep reading anywhere.",
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

  const secondaryButtonClass =
    "w-full min-h-[48px] rounded-full border border-[color:var(--gush-border)] bg-white px-6 py-3 text-base font-medium text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] active:scale-[0.98]";

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
        className={`relative w-full border border-[color:var(--gush-border)] bg-white shadow-[0_22px_56px_rgba(15,23,42,0.1)] transition-all duration-300 sm:max-w-md sm:rounded-[32px] ${
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
          <div className="h-1 w-10 rounded-full bg-black/10" />
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[color:var(--gush-border)] bg-white p-2 text-slate-400 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-700 active:scale-95"
          aria-label="Close sign-in prompt"
        >
          <X size={20} />
        </button>

        <div className="p-6 sm:p-8">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] text-slate-950 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
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
                    className="flex items-center gap-3 rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] p-3.5 shadow-[0_10px_22px_rgba(15,23,42,0.03)]"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--gush-accent-strong,#0058cc)] shadow-[inset_0_0_0_1px_var(--gush-border)]">
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
              className="w-full min-h-[48px] rounded-full bg-[color:var(--gush-ink-strong)] px-6 py-3 text-base font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.08)] transition-all duration-300 hover:bg-black/82 active:scale-[0.98]"
            >
              {primaryLabel}
            </button>
            <button
              type="button"
              onClick={handleSignup}
              className={secondaryButtonClass}
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
