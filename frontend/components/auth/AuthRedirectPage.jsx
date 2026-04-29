"use client";

import SurfacePanel from "../common/SurfacePanel";

export default function AuthRedirectPage({
  title = "Opening sign in",
  description = "Just a sec.",
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <main className="mx-auto flex min-h-screen max-w-[1320px] items-center justify-center px-4 py-8 md:px-8">
        <SurfacePanel
          appearance="dark"
          accent="cyan"
          tone="muted"
          className="relative w-full max-w-md overflow-hidden px-8 py-8 text-center"
        >
          <div className="relative mx-auto inline-flex rounded-full border-2 border-white/20 bg-black px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-white/75 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            Redirecting
          </div>
          <div className="mx-auto mt-5 h-9 w-9 animate-spin rounded-full border-2 border-white/25 border-t-[#00E5FF]" />
          <h1 className="relative mt-5 font-display text-[1.9rem] font-black uppercase tracking-[-0.05em] text-white">
            {title}
          </h1>
          <p className="relative mt-3 text-sm font-semibold leading-7 text-white/80">
            {description}
          </p>
          <p className="relative mt-6 text-xs font-black uppercase tracking-[0.24em] text-white/55">
            Loading
          </p>
        </SurfacePanel>
      </main>
    </div>
  );
}
