"use client";

import { memo, useEffect, useState } from "react";
import { X, LogIn, Sparkles, Gift, BookOpen } from "lucide-react";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";
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
        className={`relative w-full overflow-hidden border-[3px] border-black bg-white shadow-[12px_12px_0_0_rgba(0,0,0,1)] transition-all duration-300 sm:max-w-md ${
          isAnimating
            ? "translate-y-0 opacity-100 scale-100"
            : "translate-y-full sm:translate-y-0 opacity-0 sm:scale-95"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),transparent_30%)]" />
        <div className="pointer-events-none absolute -left-10 top-4 h-24 w-24 rounded-full bg-[#ffe500]/50 blur-3xl" />
        <div className="pointer-events-none absolute -right-6 bottom-8 h-24 w-24 rounded-full bg-[#00e5ff]/30 blur-3xl" />
        <div className="flex justify-center pt-3 pb-2 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-black/20" />
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center border-[3px] border-black bg-white p-2 text-black/55 transition hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#ffe7ec] hover:text-black hover:shadow-none active:translate-y-0 active:scale-95"
          aria-label="Close sign-in prompt"
        >
          <X size={20} />
        </button>

        <div className="relative p-6 sm:p-8">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border-[3px] border-black bg-[#ffe500] text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
              <LogIn size={32} />
            </div>
          </div>

          <div className="mb-6 text-center">
            {eyebrow ? (
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-black/55">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="mb-2 font-display text-2xl font-black uppercase tracking-[-0.05em] text-black sm:text-[2rem]">
              {title}
            </h2>
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
                    className="flex items-center gap-3 rounded-[22px] border-[3px] border-black bg-[#fff6cf] p-3.5 shadow-[5px_5px_0_0_rgba(0,0,0,1)]"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border-[2px] border-black bg-white text-[#ff007a]">
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

          <p className="mt-4 text-center text-xs uppercase tracking-[0.18em] text-black/40">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
});

export default LoginPrompt;
