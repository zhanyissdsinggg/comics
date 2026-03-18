"use client";

export default function AuthRedirectPage({
  title = "Opening sign in",
  description = "You'll be back to reading in a moment.",
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#f4f6fb] px-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[26rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
      <div className="relative w-full max-w-sm rounded-[28px] border border-black/8 bg-white px-8 py-7 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[var(--gush-accent,#2f6bff)] border-t-transparent" />
        <h1 className="text-base font-semibold text-slate-950">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  );
}
