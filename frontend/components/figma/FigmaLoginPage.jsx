"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Apple, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { FigmaSiteProvider, useFigmaSite } from "./FigmaSiteContext";
import { cn } from "./figma-utils";

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

  const title = mode === "register" ? "Create Account" : "Welcome Back";
  const subtitle =
    mode === "register"
      ? "Create your account and keep your reading progress synced."
      : `Sign in to continue reading your favorite ${isAdultMode ? "mature stories" : "stories"}.`;

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
    <div className={cn("relative min-h-screen overflow-hidden", palette.rootBg)}>
      <div className="absolute inset-0 z-0">
        <img
          src={
            isAdultMode
              ? "https://placehold.co/1600x1200/24060a/fff1f2?text=Mature+Library"
              : "https://placehold.co/1600x1200/0f172a/f8fafc?text=Night+Reading"
          }
          alt="Login background"
          className="h-full w-full scale-105 object-cover opacity-20 blur-md"
        />
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-t from-5% to-transparent",
            palette.heroOverlay,
          )}
        />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16">
        <div
          className={cn(
            "w-full max-w-lg rounded-3xl border p-8 shadow-2xl backdrop-blur-xl md:p-12",
            palette.surfaceGlass,
            palette.border,
          )}
        >
          <div className="mb-8 flex justify-center">
            <Link
              href="/"
              className="flex items-center gap-2 text-3xl font-black tracking-tight text-white transition-transform hover:scale-105"
            >
              GUSH
              <span className={cn(palette.primaryText)}>READS</span>
            </Link>
          </div>

          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-black tracking-tight text-white">
              {title}
            </h1>
            <p className="text-gray-400">{subtitle}</p>
          </div>

          <div className="mb-8 space-y-3">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-700 bg-black/40 px-4 py-3.5 font-bold text-white transition-colors hover:bg-white/10"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-700 bg-black/40 px-4 py-3.5 font-bold text-white transition-colors hover:bg-white/10"
            >
              <Apple className="h-5 w-5" />
              Continue with Apple
            </button>
          </div>

          <div className="relative mb-6 flex items-center py-2">
            <div className="flex-grow border-t border-gray-700" />
            <span className="mx-4 flex-shrink-0 text-xs font-bold tracking-[0.22em] text-gray-500">
              OR USE EMAIL
            </span>
            <div className="flex-grow border-t border-gray-700" />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
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
                  className="w-full rounded-xl border border-gray-800 bg-black/50 py-3.5 pl-12 pr-4 text-white placeholder:text-gray-600 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex justify-between">
                <label className="block text-sm font-bold text-gray-400">
                  Password
                </label>
                <span className={cn("text-sm font-semibold", palette.primaryText)}>
                  Forgot?
                </span>
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
                  className="w-full rounded-xl border border-gray-800 bg-black/50 py-3.5 pl-12 pr-12 text-white placeholder:text-gray-600 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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

            {error ? <p className="text-sm font-bold text-red-400">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "mt-8 w-full rounded-xl py-4 font-black uppercase tracking-[0.22em] text-white transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60",
                palette.primaryBg,
              )}
            >
              {loading
                ? mode === "register"
                  ? "Creating..."
                  : "Signing In..."
                : mode === "register"
                  ? "Create Account"
                  : "Sign In"}
            </button>
          </form>

          <p className="mt-8 text-center font-medium text-gray-400">
            {mode === "register" ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "register" ? "login" : "register")}
              className={cn("font-bold transition-colors hover:underline", palette.primaryText)}
            >
              {mode === "register" ? "Sign in" : "Sign up"}
            </button>
          </p>
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
        <div className={cn("rounded-3xl border px-6 py-5", palette.surface, palette.border)}>
          Loading sign-in...
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
