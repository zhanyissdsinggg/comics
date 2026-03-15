export function focusInteractiveTarget(target, options = {}) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const delayMs = Number(options.delayMs ?? 140);
  const block = options.block || "center";

  const timer = window.setTimeout(() => {
    const resolvedTarget =
      typeof target === "function"
        ? target()
        : target?.current || target || null;

    if (!resolvedTarget) {
      return;
    }

    if (typeof resolvedTarget.scrollIntoView === "function") {
      resolvedTarget.scrollIntoView({
        behavior: "smooth",
        block,
        inline: "nearest",
      });
    }

    if (typeof resolvedTarget.focus === "function") {
      try {
        resolvedTarget.focus({ preventScroll: true });
      } catch {
        resolvedTarget.focus();
      }
    }
  }, delayMs);

  return () => window.clearTimeout(timer);
}
