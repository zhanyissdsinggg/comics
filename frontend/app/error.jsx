"use client";

import {
  storefrontBadgeClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../components/common/StorefrontPagePrimitives";
import SurfacePanel from "../components/common/SurfacePanel";
import { StorefrontPage } from "../components/storefront/StorefrontScaffold";

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body className="bg-[#090b12] text-white">
        <StorefrontPage accentClass="from-[rgba(255,79,154,0.14)] via-[rgba(167,139,250,0.08)] to-[rgba(103,232,249,0.08)]">
          <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
            <SurfacePanel
              appearance="dark"
              accent="rose"
              tone="muted"
              className="relative w-full max-w-3xl p-8 text-center"
            >
              <span className={`${storefrontBadgeClass} px-3 py-1 text-[11px] text-white/62`}>
                Error
              </span>
              <h1 className="mt-5 font-display text-[2.2rem] font-semibold tracking-[-0.05em] text-white sm:text-[2.8rem]">
                Something went wrong
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/75">
                Retry or head back home.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => reset()}
                  className={storefrontPrimaryButtonClass}
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/";
                  }}
                  className={storefrontSecondaryButtonClass}
                >
                  Go home
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/support";
                  }}
                  className={storefrontSecondaryButtonClass}
                >
                  Support
                </button>
              </div>
            </SurfacePanel>
          </div>
        </StorefrontPage>
      </body>
    </html>
  );
}
