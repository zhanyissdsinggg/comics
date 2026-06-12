import Link from "next/link";
import { Suspense } from "react";
import { siteConfig } from "../../../lib/siteConfig";
import ResetFormClient from "./ResetFormClient";

export const metadata = {
  title: "Reset Password",
  robots: {
    index: false,
    follow: false,
  },
};

function ResetAuthShell({ children }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#070A13] font-[Inter,Geist,Satoshi,'SF_Pro_Display',system-ui,sans-serif] text-white">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .gush-app-shell > header,
            .gush-app-shell > footer,
            [data-mobile-bottom-nav="1"] {
              display: none !important;
            }

            body.has-mobile-bottom-nav {
              padding-bottom: 0 !important;
            }
          `,
        }}
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-12rem] top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-[#EC4899]/12 blur-3xl" />
        <div className="absolute right-[-10rem] bottom-[-12rem] h-[32rem] w-[32rem] rounded-full bg-[#7C3AED]/12 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,11,22,0.18),rgba(7,10,19,0.98))]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1120px] flex-col justify-center px-5 py-8 sm:px-8 lg:px-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.72fr)] lg:items-center">
          <section className="min-w-0">
            <p className="text-[10px] font-black tracking-[0.18em] text-white/46">
              Password help
            </p>
            <h1 className="mt-4 max-w-[560px] text-[2.45rem] font-black leading-[0.98] tracking-[-0.06em] text-white sm:text-[3.8rem]">
              Reset your password
            </h1>
            <p className="mt-5 max-w-[560px] text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
              Request a fresh reset email or set a new password from the secure link in your URL.
            </p>
          </section>

          <section className="min-w-0 rounded-[28px] border border-white/12 bg-white/[0.045] p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-8">
            {children}
          </section>
        </div>

        <footer className="mt-8 flex flex-col gap-3 text-xs text-white/46 sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright 2026 {siteConfig.companyName}</p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/support" className="inline-flex min-h-11 items-center transition-colors hover:text-white">
              Support
            </Link>
            <Link href="/terms-of-service" className="inline-flex min-h-11 items-center transition-colors hover:text-white">
              Terms
            </Link>
            <Link href="/privacy-policy" className="inline-flex min-h-11 items-center transition-colors hover:text-white">
              Privacy
            </Link>
          </nav>
        </footer>
      </main>
    </div>
  );
}

function ResetFormFallback() {
  return (
    <div className="space-y-5">
      <div className="h-20 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
      <div className="h-[52px] animate-pulse rounded-2xl bg-white/[0.06]" />
      <div className="h-24 animate-pulse rounded-[22px] border border-white/10 bg-white/[0.035]" />
    </div>
  );
}

export default function ResetPage() {
  return (
    <ResetAuthShell>
      <Suspense fallback={<ResetFormFallback />}>
        <ResetFormClient />
      </Suspense>
    </ResetAuthShell>
  );
}
