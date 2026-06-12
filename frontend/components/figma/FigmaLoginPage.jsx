"use client";

import Link from "next/link";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Bookmark,
  Compass,
  Eye,
  EyeOff,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { siteConfig } from "../../lib/siteConfig";
import { useAuthStore } from "../../store/useAuthStore";
import { FigmaSiteProvider } from "./FigmaSiteContext";

const VALUE_POINTS = [
  {
    label: "Private shelf",
    detail: "Your favorites, always saved.",
    icon: Bookmark,
  },
  {
    label: "Reading progress",
    detail: "Pick up right where you left off.",
    icon: BarChart3,
  },
  {
    label: "Mode-aware",
    detail: "Content that fits your mode.",
    icon: ShieldCheck,
  },
];

const COLLAGE_IMAGES = [
  {
    src: "/images/home/crimson-tide-cover.png",
    className:
      "left-[2%] bottom-[7%] h-[31%] w-[30%] rotate-[-8deg] opacity-78",
    objectPosition: "50% 36%",
  },
  {
    src: "/images/home/solar-wind-cover.png",
    className:
      "left-[31%] bottom-[4%] h-[40%] w-[31%] rotate-[-5deg] opacity-84",
    objectPosition: "46% 42%",
  },
  {
    src: "/images/home/cherry-blossom-high-cover.png",
    className:
      "right-[2%] top-[27%] h-[34%] w-[27%] rotate-[6deg] opacity-82",
    objectPosition: "48% 28%",
  },
  {
    src: "/images/home/the-last-kingdom-hero.png",
    className:
      "left-[39%] top-[-8%] h-[40%] w-[31%] rotate-[-2deg] opacity-70",
    objectPosition: "50% 18%",
  },
  {
    src: "/images/home/wild-hearts-cover.png",
    className:
      "right-[7%] bottom-[7%] h-[31%] w-[29%] rotate-[5deg] opacity-72",
    objectPosition: "50% 38%",
  },
];

function BrandMark() {
  return (
    <Link
      href="/"
      aria-label="Gush home"
      className="inline-flex min-h-9 flex-col justify-center text-white sm:min-h-11"
    >
      <span className="text-[1.55rem] font-black italic leading-none tracking-[-0.06em] sm:text-[2.45rem]">
        <span>G</span>
        <span className="bg-[linear-gradient(135deg,#EC4899,#A855F7)] bg-clip-text text-transparent">
          U
        </span>
        <span>SH</span>
      </span>
      <span className="mt-1 text-[0.5rem] font-black uppercase tracking-[0.16em] text-white/82 sm:text-[0.72rem]">
        Comics & Novels
      </span>
    </Link>
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
      body.gush-auth-route .gush-app-shell > footer,
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

function HeroCollage() {
  return (
    <div
      className="pointer-events-none absolute inset-x-[-2rem] bottom-[6.5rem] top-0 hidden lg:block"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_58%_20%,rgba(168,85,247,0.25),transparent_32%),radial-gradient(circle_at_75%_48%,rgba(236,72,153,0.18),transparent_30%)]" />
      {COLLAGE_IMAGES.map((image) => (
        <div
          key={image.src}
          className={`absolute overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/[0.035] shadow-[0_2rem_5rem_rgba(0,0,0,0.62)] ${image.className}`}
        >
          <img
            src={image.src}
            alt=""
            aria-hidden="true"
            role="presentation"
            className="h-full w-full object-cover saturate-[1.08]"
            style={{ objectPosition: image.objectPosition }}
          />
          <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,19,0.02),rgba(7,10,19,0.54))]" />
        </div>
      ))}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#070A13_0%,rgba(7,10,19,0.40)_43%,#070A13_98%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,transparent,#070A13_84%)]" />
    </div>
  );
}

function MobileHeroArt() {
  return (
    <div
      className="pointer-events-none absolute right-[-2.2rem] top-0 h-[14rem] w-[15rem] overflow-hidden rounded-b-[2rem] opacity-54 sm:hidden"
      aria-hidden="true"
    >
      <img
        src="/images/home/cherry-blossom-high-cover.png"
        alt=""
        aria-hidden="true"
        role="presentation"
        className="h-full w-full object-cover"
        style={{ objectPosition: "50% 22%" }}
      />
      <span className="absolute inset-0 bg-[linear-gradient(90deg,#070A13_4%,rgba(7,10,19,0.36)_54%,#070A13_100%)]" />
      <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,19,0.04),#070A13_96%)]" />
    </div>
  );
}

function DesktopValueCards() {
  return (
    <div className="grid grid-cols-3 gap-7 border-t border-white/8 pt-8">
      {VALUE_POINTS.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="grid min-w-0 grid-cols-[2.65rem_minmax(0,1fr)] gap-4"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#EC4899]/45 bg-[#EC4899]/8 text-[#D946EF]">
              <Icon className="h-5 w-5" strokeWidth={1.9} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-white">{item.label}</p>
              <p className="mt-1 max-w-[10rem] text-sm leading-6 text-white/62">
                {item.detail}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MobileValueStrip() {
  const getMobileLabel = (label) =>
    label === "Reading progress" ? "Progress" : label;

  return (
    <div className="grid grid-cols-3 gap-2">
      {VALUE_POINTS.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/[0.055] px-2 text-[0.62rem] font-black text-white/82 backdrop-blur-xl"
          >
            <Icon className="h-3 w-3 text-[#C084FC]" strokeWidth={2} />
            <span className="truncate">{getMobileLabel(item.label)}</span>
          </div>
        );
      })}
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
    <footer className="relative z-10 mx-auto flex w-full max-w-[1480px] flex-col gap-3 px-5 pb-5 text-[0.68rem] text-white/46 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
      <p>Copyright 2026 {siteConfig.companyName}</p>
      <nav className="flex flex-wrap gap-x-6 gap-y-2">
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

function Divider() {
  return (
    <div className="flex items-center gap-6 text-sm text-white/50">
      <span className="h-px flex-1 bg-white/10" />
      <span>or</span>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

function SecondaryAction({ icon: Icon, children, onClick, href }) {
  const className =
    "group flex min-h-[3.25rem] items-center justify-between rounded-lg border border-white/10 bg-black/10 px-4 text-sm font-black text-[#E879F9] transition hover:border-[#EC4899]/35 hover:bg-white/[0.045] sm:min-h-[4rem] sm:rounded-xl sm:px-5 sm:text-base";
  const content = (
    <>
      <span className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-[#E879F9]" strokeWidth={1.9} />
        {children}
      </span>
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
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
  rememberMe,
  setRememberMe,
  loading,
  error,
  handleSubmit,
}) {
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const isRegister = mode === "register";
  const title = isRegister ? "Create account" : "Welcome back";
  const subtitle = "Continue your stories.";
  const ctaLabel = isRegister ? "Create account" : "Sign in";

  useEffect(() => {
    const clearBrowserAutofill = () => {
      if (
        document.activeElement === emailRef.current ||
        document.activeElement === passwordRef.current
      ) {
        return;
      }
      if (emailRef.current) {
        emailRef.current.value = "";
      }
      if (passwordRef.current) {
        passwordRef.current.value = "";
      }
      setEmail("");
      setPassword("");
    };

    clearBrowserAutofill();
    const timers = [80, 320, 900].map((delay) =>
      window.setTimeout(clearBrowserAutofill, delay),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [mode, setEmail, setPassword]);

  return (
    <section className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-white/[0.045] p-[1.35rem] text-white shadow-[0_2rem_7rem_rgba(0,0,0,0.48)] backdrop-blur-2xl sm:rounded-[2rem] sm:p-10 lg:min-h-[42rem] lg:p-12 xl:p-14">
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_top_right,rgba(236,72,153,0.22),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-[1px] rounded-[calc(1.65rem-1px)] border border-white/5 sm:rounded-[calc(2rem-1px)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(236,72,153,0.92),rgba(168,85,247,0.72),transparent)]" />

      <div className="relative">
        <div>
          <h2 className="text-[2rem] font-black leading-tight tracking-[-0.045em] sm:text-[2.85rem]">
            {title}
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-white/64 sm:mt-3 sm:text-lg">
            {subtitle}
          </p>
        </div>

        <form
          className="mt-7 space-y-5 sm:mt-10 sm:space-y-7"
          onSubmit={handleSubmit}
          autoComplete="off"
        >
          <div>
            <label
              htmlFor="gush-login-email"
              className="mb-2 block text-[0.7rem] font-black text-white/88 sm:mb-3 sm:text-sm"
            >
              Email
            </label>
            <input
              ref={emailRef}
              id="gush-login-email"
              name="gush-reader-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="gush-auth-input h-12 w-full rounded-lg border border-white/10 bg-[#10131f] px-4 text-sm font-semibold text-white outline-none transition placeholder:text-white/35 focus:border-[#EC4899]/70 focus:ring-2 focus:ring-[#EC4899]/18 sm:h-14 sm:rounded-xl sm:px-5 sm:text-base"
            />
          </div>

          <div>
            <label
              htmlFor="gush-login-password"
              className="mb-2 block text-[0.7rem] font-black text-white/88 sm:mb-3 sm:text-sm"
            >
              Password
            </label>
            <div className="relative">
              <input
                ref={passwordRef}
                id="gush-login-password"
                name="gush-reader-passcode"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="new-password"
                className="gush-auth-input h-12 w-full rounded-lg border border-white/10 bg-[#10131f] px-4 pr-12 text-sm font-semibold text-white outline-none transition placeholder:text-white/35 focus:border-[#EC4899]/70 focus:ring-2 focus:ring-[#EC4899]/18 sm:h-14 sm:rounded-xl sm:px-5 sm:pr-14 sm:text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex min-h-11 w-12 items-center justify-center text-white/52 transition hover:text-white sm:w-14"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-xs font-black text-white/82 sm:text-sm">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 accent-[#8B5CF6] sm:h-5 sm:w-5"
              />
              Remember me
            </label>
            <Link
              href="/auth/reset"
              className="inline-flex min-h-11 items-center text-xs font-black text-[#F472B6] transition hover:text-white sm:text-sm"
            >
              Forgot password?
            </Link>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex h-[3.25rem] w-full items-center justify-center gap-3 rounded-lg bg-[linear-gradient(90deg,#EC4899_0%,#A855F7_52%,#7C3AED_100%)] px-5 text-sm font-black text-white shadow-[0_1.3rem_3.2rem_rgba(168,85,247,0.28)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-65 sm:h-[3.75rem] sm:rounded-xl sm:text-base"
          >
            {loading ? "Please wait..." : ctaLabel}
            {!loading ? <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" /> : null}
          </button>
        </form>

        <div className="my-5 sm:my-8">
          <Divider />
        </div>

        <div className="grid gap-3 sm:gap-4">
          <SecondaryAction
            icon={UserPlus}
            onClick={() => setMode(isRegister ? "login" : "register")}
          >
            {isRegister ? "Sign in" : "Create account"}
          </SecondaryAction>
          <SecondaryAction icon={Compass} href="/">
            Continue browsing
          </SecondaryAction>
        </div>

        <p className="mt-5 text-center text-[0.68rem] font-medium text-white/52 sm:hidden">
          Private shelf &bull; Reading progress &bull; Story picks
        </p>
      </div>
    </section>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
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
      <style jsx global>{`
        .gush-auth-input:-webkit-autofill,
        .gush-auth-input:-webkit-autofill:hover,
        .gush-auth-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #10131f inset !important;
          -webkit-text-fill-color: #ffffff !important;
          caret-color: #ffffff;
          transition: background-color 9999s ease-out;
        }
      `}</style>
      <MobileHeroArt />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-12rem] top-[-12rem] h-[32rem] w-[32rem] rounded-full bg-[#EC4899]/10 blur-3xl" />
        <div className="absolute right-[-8rem] top-4 h-[30rem] w-[30rem] rounded-full bg-[#7C3AED]/12 blur-3xl" />
        <div className="absolute bottom-[-16rem] left-[30%] h-[30rem] w-[30rem] rounded-full bg-[#38BDF8]/5 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,11,22,0.08),rgba(7,10,19,0.98))]" />
      </div>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-[1480px] items-center gap-5 px-5 py-7 sm:gap-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_620px] lg:gap-12 lg:px-12 lg:py-12">
        <section className="relative flex min-w-0 flex-col gap-3 sm:gap-7 lg:min-h-[45.5rem] lg:justify-between">
          <HeroCollage />
          <div className="relative z-10 space-y-3 sm:space-y-7 lg:space-y-28">
            <BrandMark />

            <div className="max-w-[44rem]">
              <h1 className="text-[1.8rem] font-black leading-[1.04] tracking-[-0.055em] text-white sm:text-[4rem] lg:text-[5.25rem]">
                Your shelf,
                <br />
                always{" "}
                <span className="bg-[linear-gradient(90deg,#F9A8D4_0%,#EC4899_36%,#A855F7_100%)] bg-clip-text text-transparent">
                  with you.
                </span>
              </h1>
              <p className="mt-2 max-w-[34rem] text-xs leading-5 text-white/72 sm:mt-4 sm:text-xl sm:leading-9">
                Continue comics, novels, and routes from where you left off.
              </p>
              <div className="mt-3 flex items-center gap-2 sm:mt-6">
                <span className="h-1.5 w-10 rounded-full bg-[#EC4899] sm:w-12" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#C084FC]" />
              </div>
            </div>
          </div>

          <div className="relative z-10 hidden lg:block">
            <DesktopValueCards />
          </div>

          <div className="relative z-10 lg:hidden">
            <MobileValueStrip />
          </div>
        </section>

        <div className="relative z-10 min-w-0">
          <AuthCard
            mode={mode}
            setMode={setMode}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            rememberMe={rememberMe}
            setRememberMe={setRememberMe}
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
          Loading sign in...
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
