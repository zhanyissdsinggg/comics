"use client";

import { memo, useEffect, useState } from "react";
import { X, Sparkles, Gift, BookOpen } from "lucide-react";
import SurfacePanel from "../common/SurfacePanel";
import {
  storefrontChipClass,
  storefrontBadgeClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
  storefrontSoftCardClass,
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
      <SurfacePanel
        appearance="dark"
        accent="cyan"
        tone="highlight"
        onClick={handleContentClick}
        className={`relative w-full px-0 py-0 text-white transition-all duration-300 sm:max-w-md ${
          isAnimating
            ? "translate-y-0 opacity-100 scale-100"
            : "translate-y-full sm:translate-y-0 opacity-0 sm:scale-95"
        }`}
      >
        <div className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_100%)] px-6 py-5">
          <div className="flex justify-center pb-2 sm:hidden">
            <div className="h-1.5 w-12 rounded-full bg-white/14" />
          </div>

          <button
            type="button"
            onClick={handleClose}
            className={`absolute right-4 top-4 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center p-2 text-white/74 ${storefrontChipClass}`}
            aria-label="Close sign-in prompt"
          >
            <X size={20} />
          </button>

          <div className="relative text-center">
            {eyebrow ? (
              <p className={`mb-3 ${storefrontBadgeClass}`}>
                {eyebrow}
              </p>
            ) : null}
            <h2 className="font-display text-[2rem] font-semibold leading-[0.92] tracking-[-0.06em] text-white sm:text-[2.35rem]">
              {title}
            </h2>
          </div>
        </div>

        <div className="relative p-6 sm:p-8">
          <div className="mb-6 text-center">
            {message ? (
              <p className="text-sm leading-7 text-white/72">
                {message}
              </p>
            ) : null}
          </div>

          {showFeatures && features.length > 0 && (
            <div className="mb-6 space-y-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={`${feature.text}-${index}`}
                    className={`flex items-center gap-3 ${storefrontSoftCardClass} p-3.5`}
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[18px] border border-white/12 bg-[linear-gradient(135deg,rgba(255,122,177,0.92)_0%,rgba(125,244,255,0.9)_100%)] text-[#170c1d] shadow-[0_14px_28px_rgba(255,79,154,0.2)]">
                      <Icon size={20} />
                    </div>
                    <p className="text-sm font-medium text-white/80">
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

          <p className="mt-5 text-center text-xs leading-6 text-white/42">
            Keep your progress, picks, and unlocked episodes in one place.
          </p>
        </div>
      </SurfacePanel>
    </div>
  );
});

export default LoginPrompt;
