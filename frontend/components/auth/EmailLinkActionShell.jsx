"use client";

import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";

export default function EmailLinkActionShell({
  eyebrow,
  title,
  description,
  asideTitle,
  asideBody,
  children,
}) {
  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <div className="mx-auto max-w-[1320px] px-4 py-8 md:px-8 md:py-10">
        <div className="grid gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.84fr)] lg:py-10">
          <section className="max-w-3xl self-start">
            <EditorialHero
              appearance="dark"
              accent="cyan"
              eyebrow={eyebrow}
              title={title}
              description={description}
            />
          </section>

          <aside className="space-y-6">
            <SurfacePanel
              appearance="dark"
              tone="muted"
              accent="cyan"
              className="space-y-3"
            >
              <div className="relative">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/70">
                  {asideTitle}
                </p>
                <p className="mt-3 text-sm font-semibold leading-7 text-white/80">
                  {asideBody}
                </p>
              </div>
            </SurfacePanel>

            <SurfacePanel
              appearance="dark"
              accent="cyan"
              tone="muted"
              className="border-2 border-white/20 p-6 sm:p-8"
            >
              {children}
            </SurfacePanel>
          </aside>
        </div>
      </div>
    </main>
  );
}
