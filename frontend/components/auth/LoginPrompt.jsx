"use client";

import { memo, useEffect, useState } from "react";
import { X, Sparkles, Gift, BookOpen } from "lucide-react";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";
const LoginPrompt = memo(function LoginPrompt({
  isOpen = false,
  onClose,
  eyebrow = "",
  title = "Sign in",
  message = "",
  returnTo = "/",
  primaryLabel = "Sign In",
  secondaryLabel = "Create Account",
  features = [
    { icon: BookOpen, text: "Save progress" },
    { icon: Gift, text: "Daily rewards" },
    { icon: Sparkles, text: "Personal picks" },
  ],
  showFeatures = false,
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
        isAnimating ? "bg-black/72 backdrop-blur-sm" : "bg-black/0"
      }`}
      onClick={handleClose}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div
        onClick={handleContentClick}
        className={`relative w-full overflow-hidden rounded-[30px] border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-[0_28px_60px_rgba(15,23,42,0.18)] transition-all duration-300 sm:max-w-md ${
          isAnimating
            ? "translate-y-0 opacity-100 scale-100"
            : "translate-y-full sm:translate-y-0 opacity-0 sm:scale-95"
        }`}
      >
        <div className="border-b border-black/8 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-5">
        <div className="flex justify-center pb-2 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-black/12" />
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-black/10 bg-white p-2 text-black/60 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-black/16 hover:bg-black/[0.03] hover:text-black hover:shadow-[0_12px_24px_rgba(15,23,42,0.1)] active:translate-y-px"
          aria-label="Close sign-in prompt"
        >
          <X size={20} />
        </button>

          <div className="relative text-center">
            {eyebrow ? (
              <p className="mb-3 inline-flex rounded-full border border-black/10 bg-[#f6f7f9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-black/55">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="text-3xl font-semibold leading-none tracking-[-0.06em] text-black sm:text-4xl">
              {title}
            </h2>
          </div>
        </div>

        <div className="relative p-6 sm:p-8">
          <div className="mb-6 text-center">
            {message ? (
              <p className="text-sm leading-7 text-black/68">{message}</p>
            ) : null}
          </div>

          {showFeatures && features.length > 0 && (
            <div className="mb-6 space-y-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-[22px] border border-black/10 bg-[#f6f7f9] p-3.5 shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white text-black">
                      <Icon size={20} />
                    </div>
                    <p className="text-sm font-medium text-black/68">
                      {feature.text}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleLogin}
              className={`w-full min-h-[52px] text-base ${storefrontPrimaryButtonClass}`}
            >
              {primaryLabel}
            </button>
            <button
              type="button"
              onClick={handleSignup}
              className={`w-full min-h-[52px] text-base ${storefrontSecondaryButtonClass}`}
            >
              {secondaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default LoginPrompt;
