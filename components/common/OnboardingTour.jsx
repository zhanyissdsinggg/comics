"use client";

import React, { useState, useEffect, useCallback } from "react";

/**
 * 老王注释：首次访问引导组件
 * 功能：引导新用户了解网站功能
 * 遵循KISS原则：简洁的步骤式引导
 * 遵循DRY原则：统一的步骤管理逻辑
 */
const OnboardingTour = React.memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // 老王注释：引导步骤配置
  const steps = [
    {
      id: "welcome",
      title: "Welcome to Tappytoon! 🎉",
      description:
        "Discover thousands of comics and novels. Let us show you around in just 30 seconds!",
      image: "👋",
      action: "Get Started",
    },
    {
      id: "browse",
      title: "Browse Content 📚",
      description:
        "Explore our homepage to find trending series, new releases, and personalized recommendations based on your reading history.",
      image: "🔍",
      tips: [
        "Use the search bar to find specific titles",
        "Filter by genre, status, and popularity",
        "Check out 'Time Till Free' for free unlocks",
      ],
    },
    {
      id: "read",
      title: "Start Reading 📖",
      description:
        "Click any series to view details and episodes. Tap an episode to start reading with our optimized reader.",
      image: "📱",
      tips: [
        "Customize reading settings (theme, font size)",
        "Auto-save your progress",
        "Download episodes for offline reading",
      ],
    },
    {
      id: "unlock",
      title: "Unlock Episodes 🔓",
      description:
        "Use Points to unlock premium episodes. Get free Points daily or purchase packages for unlimited reading.",
      image: "💎",
      tips: [
        "Daily check-in rewards",
        "Subscribe for exclusive perks",
        "Share with friends to earn bonus Points",
      ],
    },
    {
      id: "profile",
      title: "Your Profile 👤",
      description:
        "Track your reading history, manage bookmarks, and customize your experience in your profile.",
      image: "⚙️",
      tips: [
        "View reading statistics",
        "Manage followed series",
        "Enable notifications for updates",
      ],
    },
    {
      id: "complete",
      title: "You're All Set! 🚀",
      description:
        "Start exploring amazing stories now. Need help? Check our FAQ or contact support anytime.",
      image: "✨",
      action: "Start Reading",
    },
  ];

  // 老王注释：检查是否已完成引导
  useEffect(() => {
    const completed = localStorage.getItem("mn_onboarding_completed");
    if (!completed) {
      // 老王注释：延迟1秒显示，避免打扰用户
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // 老王注释：完成引导
  const handleComplete = useCallback(() => {
    localStorage.setItem("mn_onboarding_completed", "true");
    setIsOpen(false);
  }, []);

  // 老王注释：跳过引导
  const handleSkip = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  // 老王注释：上一步
  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  // 老王注释：下一步
  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, steps.length, handleComplete]);

  if (!isOpen) {
    return null;
  }

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-900 p-4 md:p-8">
        {/* 老王注释：进度条 */}
        <div className="mb-4 md:mb-6">
          <div className="mb-2 flex items-center justify-between text-xs text-neutral-400">
            <span>
              Step {currentStep + 1} of {steps.length}
            </span>
            <button
              onClick={handleSkip}
              className="text-neutral-500 transition-colors hover:text-neutral-300 active:text-neutral-200"
            >
              Skip Tour
            </button>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* 老王注释：步骤内容 */}
        <div className="mb-6 md:mb-8 text-center">
          <div className="mb-3 md:mb-4 text-5xl md:text-6xl">{step.image}</div>
          <h2 className="mb-2 md:mb-3 text-xl md:text-2xl font-bold text-white">{step.title}</h2>
          <p className="mb-4 md:mb-6 text-sm md:text-base text-neutral-400">{step.description}</p>

          {/* 老王注释：提示列表 */}
          {step.tips && (
            <div className="mx-auto max-w-md rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 md:p-4 text-left">
              <ul className="space-y-2">
                {step.tips.map((tip, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-neutral-300"
                  >
                    <span className="mt-0.5 text-emerald-400">✓</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 老王注释：导航按钮 */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="min-h-[44px] rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 md:px-6 py-2 md:py-3 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800 active:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-900/50"
          >
            Previous
          </button>

          <div className="flex gap-1.5 md:gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-all ${
                  index === currentStep
                    ? "w-4 md:w-6 bg-emerald-500"
                    : index < currentStep
                      ? "bg-emerald-500/50"
                      : "bg-neutral-700"
                }`}
              ></div>
            ))}
          </div>

          <button
            onClick={handleNext}
            className="min-h-[44px] rounded-lg bg-emerald-500 px-4 md:px-6 py-2 md:py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600 active:bg-emerald-700"
          >
            {step.action || "Next"}
          </button>
        </div>
      </div>
    </div>
  );
});

OnboardingTour.displayName = "OnboardingTour";

export default OnboardingTour;
