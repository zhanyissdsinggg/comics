"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Bookmark,
  Compass,
  Eye,
  EyeOff,
  Library,
  Lock,
  Mail,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { siteConfig } from "../../lib/siteConfig";
import { useAuthStore } from "../../store/useAuthStore";
import { FigmaSiteProvider } from "./FigmaSiteContext";

const VALUE_POINTS = [
  {
    label: "Private shelf",
    icon: Bookmark,
  },
  {
    label: "Reading progress",
    icon: Library,
  },
  {
    label: "Mode-aware",
    icon: ShieldCheck,
  },
];

const COLLAGE_IMAGES = [
  {
    src: "/images/home/crimson-tide-cover.png",
    className:
      "left-[38%] top-[-4%] h-[34%] w-[34%] rotate-[-3deg] opacity-80",
  },
  {
    src: "/images/home/solar-wind-cover.png",
    className:
      "right-[8%] top-[15%] h-[36%] w-[30%] rotate-[5deg] opacity-82",
  },
  {
    src: "/images/home/the-last-kingdom-hero.png",
    className:
      "left-[8%] bottom-[7%] h-[38%] w-[31%] rotate-[-6deg] opacity-76",
  },
  {
    src: "/images/home/wild-hearts-cover.png",
    className:
      "left-[37%] bottom-[2%] h-[42%] w-[32%] rotate-[4deg] opacity-82",
  },
  {
    src: "/images/home/cherry-blossom-high-cover.png",
    className:
      "right-[6%] bottom-[8%] h-[34%] w-[28%] rotate-[-4deg] opacity-72",
  },
];

function BrandMark({ compact = false }) {
  return (
    <Link
      href="/"
      aria-label="Gush home"
      className="inline-flex min-h-11 flex-col justify-center tracking-tight text-white"
    >
      <span
        className={
          compact
            ? "text-2xl font-black leading-none"
            : "text-[42px] font-black italic leading-none"
        }
      >
        <span>G</span>
        <span className="text-[#EC4899]">U</span>
        <span>SH</span>
      </span>
      <span className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/78">
        Comics & Novels
      </span>
    </Link>
  );
}

function DecorativeCollage() {
  return (
    <div
      className="pointer-events-none relative hidden min-h-[470px] overflow-hidden rounded-[32px] border border-white/8 bg-white/[0.025] lg:block"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_62%_35%,rgba(236,72,153,0.20),transparent_34%),radial-gradient(circle_at_48%_78%,rgba(124,58,237,0.20),transparent_34%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,10,19,0.82)_0%,rgba(7,10,19,0.24)_48%,rgba(7,10,19,0.76)_100%)]" />
      {COLLAGE_IMAGES.map((image) => (
        <div
          key={image.src}
          className={`absolute overflow-hidden rounded-[24px] border border-white/10 bg-white/5 shadow-[0_28px_80px_rgba(0,0,0,0.55)] ${image.className}`}
        >
          <img
            src={image.src}
            alt=""
            aria-hidden="true"
            role="presentation"
            className="h-full w-full object-cover saturate-[1.04]"
          />
          <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,19,0.05),rgba(7,10,19,0.42))]" />
        </div>
      ))}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_58%,#070A13_100%)]" />
    </div>
  );
}

function ValueStrip({ compact = false }) {
  return (
    <div
      className={
        compact
          ? "grid grid-cols-3 gap-2"
          : "grid gap-4 sm:grid-cols-3 lg:gap-6"
      }
    >
      {VALUE_POINTS.map(({ label, icon: Icon }) => (
        <div
          key={label}
          className={
            compact
              ? "rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-center"
              : "flex gap-4 border-t border-white/10 pt-6"
          }
        >
          <span
            className={
              compact
                ? "mx-auto mb-1 flex h-5 w-5 items-center justify-center text-[#EC4899]"
                : "mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#EC4899]/30 bg-[#EC4899]/10 text-[#EC4899]"
            }
          >
            <Icon className={compact ? "h-3.5 w-3.5" : "h-5 w-5"} />
          </span>
          <span className="block min-w-0">
            <span
              className={
                compact
                  ? "block text-[10px] font-black leading-tight text-white"
                  : "block text-base font-black text-white"
              }
            >
              {label}
            </span>
            {!compact ? (
              <span className="mt-2 block h-1.5 w-10 rounded-full bg-[linear-gradient(90deg,#EC4899,#A855F7)] opacity-65" />
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}

function LegalFooter() {
  const legalLinks = [
    { href: "/terms-of-service", label: "Terms of Service" },
    { href: "/privacy-policy", label: "Privacy Policy" },
    { href: "/support", label: "Contact" },
  ];

  return (
    <footer className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-5 pb-6 text-xs text-white/46 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
      <p>Copyright 2026 {siteConfig.companyName}</p>
      <nav className="flex flex-wrap gap-x-7 gap-y-2">
        {legalLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="min-h-11 transition-colors hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}

function AuthRouteChrome() {
  useEffect(() => {
    document.body.classList.add("gush-auth-route");

    return () => {
      document.body.classList.remove("gush-auth-route");
    };
  }, []);

  return (
    <style jsx global>{`
      body.gush-auth-route .gush-app-shell > header,
      body.gush-auth-route .gush-app-shell > footer {
        display: none;
      }

      body.gush-auth-route [data-mobile-bottom-nav="1"] {
        display: none;
      }

      body.gush-auth-route.has-mobile-bottom-nav {
        padding-bottom: 0;
      }

      body.gush-auth-route .gush-app-shell-content {
        min-width: 0;
      }
    `}</style>
  );
}

function AuthCard({
  mode,
  setMode,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  loading,
  error,
  handleSubmit,
}) {
  const isRegister = mode === "register";
  const title = isRegister ? "Create your reader pass" : "Welcome back";
  const subtitle = isRegister
    ? "Start a shelf for comics, novels, and interactive routes."
    : "Continue your stories.";
  const ctaLabel = isRegister ? "Create account" : "Sign in";

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 text-white shadow-[0_34px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8 lg:rounded-[32px] lg:p-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(236,72,153,0.20),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(236,72,153,0.85),transparent)]" />

      <div className="relative">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[32px] font-black leading-tight tracking-[-0.04em] sm:text-[40px]">
              {title}
            </h2>
            <p className="mt-3 text-base leading-7 text-white/64">{subtitle}</p>
          </div>
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-[#F472B6] sm:flex">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="gush-login-email"
              className="mb-2 block text-sm font-bold text-white/82"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/34" />
              <input
                id="gush-login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete={isRegister ? "email" : "username"}
                className="h-12 w-full rounded-xl border border-white/10 bg-[#111421]/82 pl-12 pr-4 text-base font-semibold text-white outline-none transition placeholder:text-white/34 focus:border-[#EC4899]/70 focus:ring-2 focus:ring-[#EC4899]/18 sm:h-14 sm:rounded-2xl"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label
                htmlFor="gush-login-password"
                className="block text-sm font-bold text-white/82"
              >
                Password
              </label>
              <Link
                href="/auth/reset"
                className="inline-flex min-h-11 items-center text-sm font-bold text-[#F472B6] transition-colors hover:text-white"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/34" />
              <input
                id="gush-login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                className="h-12 w-full rounded-xl border border-white/10 bg-[#111421]/82 pl-12 pr-12 text-base font-semibold text-white outline-none transition placeholder:text-white/34 focus:border-[#EC4899]/70 focus:ring-2 focus:ring-[#EC4899]/18 sm:h-14 sm:rounded-2xl"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex min-h-11 w-12 items-center justify-center text-white/46 transition-colors hover:text-white"
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
            <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex h-[52px] w-full items-center justify-center gap-3 rounded-xl bg-[linear-gradient(90deg,#EC4899_0%,#A855F7_52%,#7C3AED_100%)] px-5 text-sm font-black text-white shadow-[0_18px_44px_rgba(168,85,247,0.28)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-65 sm:h-[60px] sm:rounded-2xl sm:text-base"
          >
            {loading ? "Preparing your reader pass..." : ctaLabel}
            {!loading ? <ArrowRight className="h-5 w-5" /> : null}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4 text-sm text-white/42">
          <span className="h-px flex-1 bg-white/10" />
          <span>or</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => setMode(isRegister ? "login" : "register")}
            className="group flex min-h-[52px] items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] px-4 text-sm font-black text-[#F0ABFC] transition hover:border-[#EC4899]/35 hover:bg-white/[0.055] sm:min-h-[58px] sm:rounded-2xl sm:px-5"
          >
            <span className="flex items-center gap-3">
              <UserPlus className="h-5 w-5" />
              {isRegister ? "Already have a reader pass? Sign in" : "Create account"}
            </span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
          <Link
            href="/"
            className="group flex min-h-[52px] items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] px-4 text-sm font-black text-[#D8B4FE] transition hover:border-[#A855F7]/35 hover:bg-white/[0.055] sm:min-h-[58px] sm:rounded-2xl sm:px-5"
          >
            <span className="flex items-center gap-3">
              <Compass className="h-5 w-5" />
              Continue browsing
            </span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    <div className="relative min-h-screen overflow-x-hidden bg-[#070A13] font-[Inter,Geist,Satoshi,'SF_Pro_Display',system-ui,sans-serif] text-white">
      <AuthRouteChrome />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-14rem] top-[-12rem] h-[34rem] w-[34rem] rounded-full bg-[#EC4899]/12 blur-3xl" />
        <div className="absolute right-[-10rem] top-12 h-[32rem] w-[32rem] rounded-full bg-[#7C3AED]/14 blur-3xl" />
        <div className="absolute bottom-[-16rem] left-[30%] h-[30rem] w-[30rem] rounded-full bg-[#38BDF8]/6 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,11,22,0.12),rgba(7,10,19,0.96))]" />
      </div>

      <main className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1480px] items-center gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(520px,0.92fr)] lg:px-12 lg:py-12 xl:gap-14">
        <section className="flex min-w-0 flex-col gap-6 lg:min-h-[760px] lg:justify-between">
          <div className="space-y-7 sm:space-y-8">
            <BrandMark compact />

            <div className="max-w-[650px]">
              <h1 className="text-[42px] font-black leading-[0.98] tracking-[-0.06em] text-white sm:text-[58px] lg:text-[72px] xl:text-[84px]">
                Your shelf,
                <br />
                always{" "}
                <span className="bg-[linear-gradient(90deg,#F9A8D4_0%,#A855F7_74%)] bg-clip-text text-transparent">
                  with you.
                </span>
              </h1>
              <p className="mt-5 max-w-[520px] text-base leading-7 text-white/72 sm:text-lg sm:leading-8 lg:text-xl">
                Continue comics, novels, and routes from where you left off.
              </p>
              <div className="mt-7 hidden h-1.5 w-16 rounded-full bg-[linear-gradient(90deg,#EC4899,#A855F7)] lg:block" />
            </div>

            <div className="lg:hidden">
              <ValueStrip compact />
            </div>

            <DecorativeCollage />
          </div>

          <div className="hidden lg:block">
            <ValueStrip />
          </div>
        </section>

        <div className="min-w-0 lg:pl-2 xl:pl-6">
          <AuthCard
            mode={mode}
            setMode={setMode}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            loading={loading}
            error={error}
            handleSubmit={handleSubmit}
          />
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-screen bg-[#070A13]">
      <div className="flex min-h-screen items-center justify-center px-4 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/[0.045] px-6 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl">
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
