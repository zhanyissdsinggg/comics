"use client";

export default function SurfacePanel({ children, className = "" }) {
  return (
    <div
      className={[
        "rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]",
        "p-5 shadow-[0_24px_100px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
