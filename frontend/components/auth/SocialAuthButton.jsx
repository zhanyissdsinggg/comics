"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { trackEvent } from "../../lib/trackEvent";
import { isGoogleAuthEnabled } from "../../lib/socialAuthConfig";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function SocialAuthButton({
  provider,
  onSuccess,
  onError,
  isLoading,
  requestPayload,
  action = "login",
}) {
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef(null);
  const googleEnabled = isGoogleAuthEnabled();

  const handleGoogleCallback = useCallback(
    async (response) => {
      setLoading(true);
      trackEvent("social_login_attempt", { provider: "google", action });

      try {
        const result = await fetch("/api/auth/google/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: response?.credential || "",
            ...(requestPayload && typeof requestPayload === "object"
              ? requestPayload
              : {}),
          }),
        });

        if (result.ok) {
          const data = await result.json();
          trackEvent("social_login_success", { provider: "google", action });
          onSuccess?.(data);
          return;
        }

        let message = "Google login failed";
        try {
          const error = await result.json();
          message = error?.message || error?.error || message;
        } catch {
          // ignore JSON parse error
        }
        onError?.(message);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Google callback error";
        console.error("Google callback error:", error);
        trackEvent("social_login_error", {
          provider: "google",
          action,
          error: message,
        });
        onError?.(message);
      } finally {
        setLoading(false);
      }
    },
    [action, onError, onSuccess, requestPayload],
  );

  useEffect(() => {
    if (provider !== "google") {
      return undefined;
    }

    if (!googleEnabled) {
      setGoogleReady(false);
      return undefined;
    }

    let intervalId;
    let timeoutId;

    const renderGoogleButton = () => {
      if (typeof window === "undefined") {
        return false;
      }
      const google = window.google;
      const container = googleButtonRef.current;
      if (!google?.accounts?.id || !container) {
        return false;
      }

      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
      });

      container.innerHTML = "";
      google.accounts.id.renderButton(container, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        width: 320,
      });

      setGoogleReady(true);
      return true;
    };

    if (!renderGoogleButton()) {
      intervalId = window.setInterval(() => {
        if (renderGoogleButton()) {
          window.clearInterval(intervalId);
          window.clearTimeout(timeoutId);
        }
      }, 200);

      timeoutId = window.setTimeout(() => {
        window.clearInterval(intervalId);
        setGoogleReady(false);
      }, 8000);
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [provider, handleGoogleCallback, googleEnabled]);

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
          onSuccess?.(data);
          return;
        }

        const error = await result.json();
        onError?.(error?.message || "Apple login failed");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Apple callback error";
        console.error("Apple callback error:", error);
        onError?.(message);
      }
    },
    [onError, onSuccess],
  );

  const handleAppleLogin = useCallback(async () => {
    setLoading(true);

    try {
      trackEvent("social_login_attempt", { provider: "apple" });

      if (typeof window === "undefined") {
        return;
      }
      if (!window.AppleID) {
        onError?.("Apple Sign In not available");
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
      const message =
        error instanceof Error ? error.message : "Apple login error";
      console.error("Apple login error:", error);
      trackEvent("social_login_error", { provider: "apple", error: message });
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [handleAppleCallback, onError]);

  if (provider === "google") {
    if (!googleEnabled) {
      return null;
    }

    return (
      <div className="w-full space-y-2">
        <div className="flex min-h-[48px] w-full items-center justify-center overflow-hidden rounded-[20px] border-[3px] border-black bg-white px-2 py-1 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
          <div ref={googleButtonRef} className="w-full max-w-[320px]" />
        </div>
        {GOOGLE_CLIENT_ID && !googleReady ? (
          <p className="text-center text-xs uppercase tracking-[0.18em] text-black/45">
            Loading Google Sign-In...
          </p>
        ) : null}
        {loading || isLoading ? (
          <p className="text-center text-xs uppercase tracking-[0.18em] text-black/45">
            Signing in...
          </p>
        ) : null}
      </div>
    );
  }

  if (provider === "apple") {
    return (
      <button
        type="button"
        onClick={handleAppleLogin}
        disabled={loading || isLoading}
        className="group relative flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[20px] border-[3px] border-black bg-white px-4 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-black transition duration-200 hover:-translate-y-0.5 hover:bg-[#fff6cf] disabled:cursor-not-allowed disabled:opacity-50"
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
