"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import {
  storefrontInfoCardClass,
  storefrontInputClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
  storefrontSoftCardClass,
  StorefrontInfoCard,
  StorefrontSectionHeading,
} from "../common/StorefrontPagePrimitives";
import { siteConfig } from "../../lib/siteConfig";
import { getFallbackImageUrl } from "../../lib/fallbackImage";
import { useAuthStore } from "../../store/useAuthStore";
import { FigmaSiteProvider, useFigmaSite } from "./FigmaSiteContext";
import { cn } from "./figma-utils";

const TRUST_POINTS = [
  {
    title: "Reader profile",
    body: "Keep progress, bookmarks, and wallet state attached to the same reader identity.",
  },
  {
    title: "Fast return",
    body: "Reopen the exact chapter or branch you left on another device.",
  },
  {
    title: "Protected access",
    body: "Account gating keeps mature visibility and purchase state tied to your profile.",
  },
];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { palette, isAdultMode } = useFigmaSite();
  const { signIn } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState(
    searchParams?.get("mode") === "register" ? "register" : "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const returnTo = useMemo(
    () => searchParams?.get("returnTo") || "/",
    [searchParams],
  );

  const title =
    mode === "register" ? "Create your reader pass" : "Welcome back";
  const subtitle =
    mode === "register"
      ? "Create one reader pass for history, bookmarks, and wallet state."
      : "Pick up your shelf without losing your place.";
  const accentTone = isAdultMode
    ? "bg-red-500/10 text-red-300"
    : "bg-cyan-400/10 text-cyan-300";
  const accent = isAdultMode ? "rose" : "blue";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await signIn(email, password, mode);

    if (!response?.ok) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    router.push(returnTo);
    router.refresh();
  };

  return (
    <div
      className={cn("relative min-h-screen overflow-hidden", palette.rootBg)}
    >
      <div className="absolute inset-0 z-0">
        <img
          src={
            isAdultMode
              ? getFallbackImageUrl({ kind: "banner", adult: true })
              : getFallbackImageUrl({ kind: "banner", adult: false })
          }
          alt=""
          aria-hidden="true"
          role="presentation"
          className="h-full w-full scale-105 object-cover opacity-20 blur-md"
        />
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-b from-transparent via-black/45 to-black/85",
            palette.heroOverlay,
          )}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:py-12 md:px-8 md:py-16">
        <div className="grid w-full gap-4 md:gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          <div className="space-y-4">
            <EditorialHero
              accent={accent}
              appearance="dark"
              eyebrow={mode === "register" ? "Reader Access" : "Account Return"}
              title={title}
              description={subtitle}
              secondary={isAdultMode ? "18+ mode active" : "Core mode active"}
              stats={[
                {
                  label: "Shelf sync",
                  value: "Active",
                  hint: "Progress, bookmarks, and purchases stay tied to one identity.",
                },
                {
                  label: "Return path",
                  value: returnTo,
                  hint: "After auth we send readers back where they came from.",
                },
                {
                  label: "Gate safety",
                  value: isAdultMode ? "Adult profile" : "Normal profile",
                  hint: "Mode state stays attached to the same account flow.",
                },
              ]}
              actions={
                <>
                  <Link href="/" className={storefrontSecondaryButtonClass}>
                    {siteConfig.siteName.toUpperCase()}
                  </Link>
                  <span
                    className={cn(
                      "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[10px] font-black uppercase tracking-[0.22em] md:text-xs",
                      accentTone,
                    )}
                  >
                    <Sparkles className="h-4 w-4" />
                    {mode === "register" ? "Create account" : "Sign in"}
                  </span>
                </>
              }
            />

            <SurfacePanel
              tone="muted"
              accent={accent}
              appearance="dark"
              className="space-y-5"
            >
              <StorefrontSectionHeading
                eyebrow="Reader Access"
                title="Email access for your shelf"
                description="The current account flow stays simple: email, password, and a clean return path."
              />

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  "Sign in and reopen the exact chapter you left on.",
                  "Keep your shelf, bookmarks, and purchases tied to one account.",
                  "Adult mode stays attached to the same reader profile and gate checks.",
                ].map((item) => (
                  <div
                    key={item}
                    className={`${storefrontSoftCardClass} px-4 py-4 text-sm leading-6 text-white/66`}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </SurfacePanel>

            <div className="grid gap-3 sm:grid-cols-3">
              {TRUST_POINTS.map((item) => (
                <StorefrontInfoCard
                  key={item.title}
                  title={item.title}
                  description={item.body}
                  className="h-full"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-white/5 text-white">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                </StorefrontInfoCard>
              ))}
            </div>
          </div>

          <SurfacePanel
            tone="muted"
            accent={accent}
            appearance="dark"
            className="rounded-[34px] p-4 md:p-8"
          >
            <div className="mb-5 flex items-start justify-between gap-4 md:mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500 md:text-xs">
                  {mode === "register" ? "Create account" : "Sign in"}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">
                  {mode === "register"
                    ? "Create account"
                    : "Email sign in"}
                </h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-white">
                <ShieldCheck className={cn("h-5 w-5", palette.primaryText)} />
              </div>
            </div>

            <div className={`${storefrontInfoCardClass} mb-5 px-4 py-4 md:mb-6`}>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500 md:text-xs">
                Email access
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Use the account email and password flow currently connected to this storefront.
              </p>
            </div>

            <form className="space-y-3.5 md:space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-400">
                  Email Address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className={cn(
                      `${storefrontInputClass} mt-0 pl-12 pr-4`,
                      isAdultMode
                        ? "border-gray-800 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        : "border-gray-800 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400",
                    )}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between">
                  <label className="block text-sm font-bold text-gray-400">
                    Password
                  </label>
                  <Link
                    href="/auth/reset"
                    className={cn(
                      "text-sm font-semibold transition-colors hover:underline",
                      palette.primaryText,
                    )}
                  >
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className={cn(
                      `${storefrontInputClass} mt-0 pl-12 pr-12`,
                      isAdultMode
                        ? "border-gray-800 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        : "border-gray-800 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 transition-colors hover:text-gray-300"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  `mt-1 w-full md:mt-2 ${storefrontPrimaryButtonClass}`,
                  "justify-center gap-2 rounded-2xl py-3.5 text-sm font-black uppercase tracking-[0.22em] text-white hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 md:py-4",
                )}
              >
                {loading
                  ? mode === "register"
                    ? "Creating..."
                    : "Signing in..."
                  : mode === "register"
                    ? "Create account"
                    : "Sign in"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className={`mt-5 md:mt-6 ${storefrontInfoCardClass}`}>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500 md:text-xs">
                Reader flow
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                {mode === "register"
                  ? "After account creation we return you to your original page and keep the session warm."
                  : "After sign-in we send you back to the page that requested authentication."}
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                {
                  label: "Reader Shelf",
                  text: "Progress, favorites, and saved titles stay together.",
                },
                {
                  label: "Fast Return",
                  text: "Jump back into the same chapter or branch on another device.",
                },
                {
                  label: "Mode Safe",
                  text: isAdultMode
                    ? "Adult gate state stays attached to this signed-in profile."
                    : "Normal mode stays clean with the current content filters.",
                },
              ].map((item) => (
                <div key={item.label} className={`${storefrontSoftCardClass} px-3 py-3`}>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-300">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-5 text-center text-sm font-medium text-gray-400 md:mt-6">
              {mode === "register"
                ? "Already have an account?"
                : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() =>
                  setMode(mode === "register" ? "login" : "register")
                }
                className={cn(
                  "font-bold transition-colors hover:underline",
                  palette.primaryText,
                )}
              >
                {mode === "register" ? "Sign in" : "Sign up"}
              </button>
            </p>
          </SurfacePanel>
        </div>
      </div>
    </div>
  );
}

function LoginFallback() {
  const { palette } = useFigmaSite();

  return (
    <div className={cn("min-h-screen", palette.rootBg)}>
      <div className="flex min-h-screen items-center justify-center px-4 text-white">
        <div
          className={cn(
            "rounded-3xl border px-6 py-5",
            palette.surface,
            palette.border,
          )}
        >
          Preparing your reader pass...
        </div>
      </div>
    </div>
  );
}

export default function FigmaLoginPage() {
  return (
    <FigmaSiteProvider>
      <Suspense fallback={<LoginFallback />}>
        <LoginContent />
      </Suspense>
    </FigmaSiteProvider>
  );
}
