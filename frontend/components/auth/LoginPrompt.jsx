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
    { icon: Sparkles, text: "Personalized recommendations" }
  ],
  showFeatures = true
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
        detail: { returnTo }
      });
      window.dispatchEvent(event);
    }, 300);
  };

  const handleSignup = () => {
    handleClose();
    setTimeout(() => {
      const event = new CustomEvent("auth:open", {
        detail: { returnTo, mode: "register" }
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
      className={`fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300 ${
        isAnimating ? "bg-black/60 backdrop-blur-sm" : "bg-black/0"
      }`}
      onClick={handleClose}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div
        onClick={handleContentClick}
        className={`relative w-full sm:max-w-md bg-neutral-900/95 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-300 sm:rounded-3xl ${
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
          className="absolute right-4 top-4 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full p-2 text-neutral-400 transition-all duration-300 hover:bg-white/10 hover:text-white active:scale-95"
          aria-label="Close sign-in prompt"
        >
          <X size={20} />
        </button>

        <div className="p-6 sm:p-8">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 text-emerald-400">
              <LogIn size={32} />
            </div>
          </div>

          <div className="mb-6 text-center">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
              {eyebrow}
            </p>
            <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
            <p className="text-sm text-neutral-400">{message}</p>
          </div>

          {showFeatures && features.length > 0 && (
            <div className="mb-6 space-y-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-xl border border-neutral-800/50 bg-neutral-900/50 p-3"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                      <Icon size={20} />
                    </div>
                    <p className="text-sm text-neutral-300">{feature.text}</p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleLogin}
              className="w-full min-h-[48px] rounded-full bg-emerald-500 px-6 py-3 text-base font-bold text-white transition-all duration-300 hover:bg-emerald-600 active:scale-[0.98] shadow-lg shadow-emerald-500/20"
            >
              {primaryLabel}
            </button>
            <button
              type="button"
              onClick={handleSignup}
              className="w-full min-h-[48px] rounded-full border border-neutral-700 px-6 py-3 text-base font-medium text-neutral-200 transition-all duration-300 hover:border-neutral-600 hover:bg-white/5 active:scale-[0.98]"
            >
              {secondaryLabel}
            </button>
          </div>

          <p className="mt-4 text-center text-xs text-neutral-500">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
});

export default LoginPrompt;
