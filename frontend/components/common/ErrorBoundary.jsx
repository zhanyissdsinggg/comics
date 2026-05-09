"use client";

import { Component } from "react";
import { trackEvent } from "../../lib/trackEvent";
import { reportClientError } from "../../lib/reportClientError";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "./StorefrontPagePrimitives";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    const payload = {
      boundaryName: this.props.name || "unnamed",
      message: error?.message || error?.toString?.() || "Unknown client error",
      stack: error?.stack || "",
      componentStack: errorInfo?.componentStack || "",
      digest: error?.digest || "",
    };

    trackEvent("error_boundary_triggered", payload);
    void reportClientError(payload);

    this.setState({
      error,
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          reset: this.handleReset,
        });
      }

      return (
        <div className="relative min-h-screen overflow-hidden bg-[var(--gush-bg)] p-4 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,79,154,0.12),transparent_22%),radial-gradient(circle_at_top_right,rgba(103,232,249,0.08),transparent_18%)]" />
          <div className="mx-auto flex min-h-screen max-w-[1320px] items-center justify-center">
            <div className="w-full max-w-xl">
              <div className="relative overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(29,24,37,0.98)_0%,rgba(16,13,24,0.98)_100%)] p-7 shadow-[0_28px_72px_rgba(8,6,20,0.36)] backdrop-blur-xl">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,79,154,0.14),transparent_24%)]" />
                <div className="relative mb-5 inline-flex rounded-full border border-[rgba(255,79,154,0.2)] bg-[rgba(255,79,154,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ffd7e8]">
                  Client error
                </div>
                <div className="relative flex items-start gap-3">
                  <div className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-[rgba(255,79,154,0.22)] bg-[rgba(255,79,154,0.12)] text-[var(--gush-danger)]">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-[1.9rem] font-semibold tracking-[-0.05em] text-white">
                      {this.props.title || "Something went wrong"}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-white/70">
                      {this.props.message ||
                        "An unexpected error interrupted this page. You can retry or reload and jump back in."}
                    </p>

                    {process.env.NODE_ENV === "development" &&
                    this.state.error ? (
                      <details className="mt-4">
                        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-white/55 hover:text-white">
                          Error details (dev only)
                        </summary>
                        <pre className="mt-2 overflow-auto rounded-[22px] border border-white/10 bg-[rgba(8,7,14,0.86)] p-3 text-[10px] leading-5 text-white/78 shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
                          {this.state.error.toString()}
                          {"\n\n"}
                          {this.state.errorInfo?.componentStack}
                        </pre>
                      </details>
                    ) : null}

                    <div className="mt-6 flex flex-wrap gap-2.5">
                      <button
                        onClick={this.handleReset}
                        className={storefrontPrimaryButtonClass}
                      >
                        Retry
                      </button>
                      <button
                        onClick={() => window.location.reload()}
                        className={storefrontSecondaryButtonClass}
                      >
                        Reload page
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
