"use client";

import { useCallback, useState } from "react";
import { trackEvent } from "../../lib/trackEvent";

export default function SocialAuthButton({ provider, onSuccess, onError, isLoading }) {
  const [loading, setLoading] = useState(false);

  const handleGoogleCallback = useCallback(
    async (response) => {
      try {
        const result = await fetch("/api/auth/google/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: response.credential }),
        });

        if (result.ok) {
          const data = await result.json();
          trackEvent("social_login_success", { provider: "google" });
          onSuccess(data);
          return;
        }

        const error = await result.json();
        onError(error.message || "Google login failed");
      } catch (error) {
        console.error("Google callback error:", error);
        onError(error.message);
      }
    },
    [onError, onSuccess],
  );

  const handleAppleCallback = useCallback(
    async (response) => {
      try {
        const result = await fetch("/api/auth/apple/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: response.authorization.code,
            user: response.user,
          }),
        });

        if (result.ok) {
          const data = await result.json();
          trackEvent("social_login_success", { provider: "apple" });
          onSuccess(data);
          return;
        }

        const error = await result.json();
        onError(error.message || "Apple login failed");
      } catch (error) {
        console.error("Apple callback error:", error);
        onError(error.message);
      }
    },
    [onError, onSuccess],
  );

  const handleGoogleLogin = useCallback(async () => {
    setLoading(true);
    try {
      trackEvent("social_login_attempt", { provider: "google" });

      if (typeof window === "undefined") {
        return;
      }
      if (!window.google) {
        onError("Google API not available");
        return;
      }

      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
      });

      window.google.accounts.id.renderButton(
        document.getElementById("google-signin-button"),
        { theme: "outline", size: "large" },
      );
    } catch (error) {
      console.error("Google login error:", error);
      trackEvent("social_login_error", { provider: "google", error: error.message });
      onError(error.message);
    } finally {
      setLoading(false);
    }
  }, [handleGoogleCallback, onError]);

  const handleAppleLogin = useCallback(async () => {
    setLoading(true);
    try {
      trackEvent("social_login_attempt", { provider: "apple" });

      if (typeof window === "undefined") {
        return;
      }
      if (!window.AppleID) {
        onError("Apple Sign In not available");
        return;
      }

      window.AppleID.auth.init({
        clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID,
        teamId: process.env.NEXT_PUBLIC_APPLE_TEAM_ID,
        redirectURI: `${window.location.origin}/api/auth/apple/callback`,
        scope: "name email",
        responseType: "code",
        responseMode: "form_post",
        usePopup: true,
      });

      const response = await window.AppleID.auth.signIn();
      await handleAppleCallback(response);
    } catch (error) {
      console.error("Apple login error:", error);
      trackEvent("social_login_error", { provider: "apple", error: error.message });
      onError(error.message);
    } finally {
      setLoading(false);
    }
  }, [handleAppleCallback, onError]);

  if (provider === "google") {
    return (
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading || isLoading}
        className="group relative flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[12px] border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-200 transition-all duration-300 hover:border-blue-500/20 hover:bg-blue-500/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Sign in with Google"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        {loading || isLoading ? "Signing in..." : "Google"}
      </button>
    );
  }

  if (provider === "apple") {
    return (
      <button
        type="button"
        onClick={handleAppleLogin}
        disabled={loading || isLoading}
        className="group relative flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[12px] border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-200 transition-all duration-300 hover:border-neutral-400/20 hover:bg-neutral-400/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Sign in with Apple"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 13.5c-.91 0-1.82.55-2.25 1.51.93.64 1.54 1.89 1.54 3.22 0 2.18-1.66 3.95-3.72 3.95-2.04 0-3.71-1.77-3.71-3.95 0-1.33.61-2.58 1.54-3.22-.43-.96-1.34-1.51-2.25-1.51-2.06 0-3.71 1.77-3.71 3.95 0 2.18 1.65 3.95 3.71 3.95 1.38 0 2.6-.67 3.36-1.67.76 1 1.98 1.67 3.36 1.67 2.06 0 3.71-1.77 3.71-3.95 0-2.18-1.65-3.95-3.71-3.95z" />
        </svg>
        {loading || isLoading ? "Signing in..." : "Apple"}
      </button>
    );
  }

  return null;
}
