"use client";

import { Component } from "react";
import { trackEvent } from "../../lib/trackEvent";
import { reportClientError } from "../../lib/reportClientError";

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
        <div className="gush-home-shell relative min-h-screen overflow-hidden p-4 text-slate-900">
          <div className="gush-page-ambient" />
          <div className="gush-page-main flex min-h-screen items-center justify-center">
            <div className="w-full max-w-xl">
              <div className="relative rounded-[32px] border border-red-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,241,242,0.98))] p-7 shadow-[0_26px_70px_rgba(15,23,42,0.08)]">
                <div className="mb-5 inline-flex rounded-full border border-red-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-red-500">
                  Client error
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-red-500"
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
                    <h3 className="font-display text-[1.9rem] font-semibold tracking-tight text-slate-950">
                      {this.props.title || "Something went wrong"}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {this.props.message ||
                        "An unexpected error occurred. Please try again."}
                    </p>

                    {process.env.NODE_ENV === "development" && this.state.error ? (
                      <details className="mt-4">
                        <summary className="cursor-pointer text-xs text-red-500 hover:text-red-600">
                          Error details (dev only)
                        </summary>
                        <pre className="mt-2 overflow-auto rounded-2xl bg-white p-3 text-[10px] text-slate-600">
                          {this.state.error.toString()}
                          {"\n\n"}
                          {this.state.errorInfo?.componentStack}
                        </pre>
                      </details>
                    ) : null}

                    <div className="mt-6 flex flex-wrap gap-2.5">
                      <button
                        onClick={this.handleReset}
                        className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Try again
                      </button>
                      <button
                        onClick={() => window.location.reload()}
                        className="rounded-full border border-black/8 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
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
