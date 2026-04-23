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
        <div className="relative min-h-screen overflow-hidden bg-black p-4 text-black">
          <div className="mx-auto flex min-h-screen max-w-[1320px] items-center justify-center">
            <div className="w-full max-w-xl">
              <div className="relative overflow-hidden rounded-[32px] border-[3px] border-black bg-white p-7 shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),transparent_32%)]" />
                <div className="relative mb-5 inline-flex rounded-full border-[3px] border-black bg-[#ffe7ec] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-black/60">
                  Client error
                </div>
                <div className="relative flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-[#ff007a]"
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
                    <h3 className="font-display text-[1.9rem] font-black uppercase tracking-[-0.05em] text-black">
                      {this.props.title || "Something went wrong"}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-black/68">
                      {this.props.message ||
                        "An unexpected error occurred. Please try again."}
                    </p>

                    {process.env.NODE_ENV === "development" &&
                    this.state.error ? (
                      <details className="mt-4">
                        <summary className="cursor-pointer text-xs uppercase tracking-[0.16em] text-[#ff007a] hover:text-[#d70068]">
                          Error details (dev only)
                        </summary>
                        <pre className="mt-2 overflow-auto rounded-[20px] border-[3px] border-black bg-[#fff6cf] p-3 text-[10px] text-black/72 shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
                          {this.state.error.toString()}
                          {"\n\n"}
                          {this.state.errorInfo?.componentStack}
                        </pre>
                      </details>
                    ) : null}

                    <div className="mt-6 flex flex-wrap gap-2.5">
                      <button
                        onClick={this.handleReset}
                        className="rounded-full border-[3px] border-black bg-black px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.14em] text-white shadow-[6px_6px_0_0_rgba(255,0,122,1)] transition hover:-translate-y-0.5 hover:bg-[#ff007a]"
                      >
                        Try again
                      </button>
                      <button
                        onClick={() => window.location.reload()}
                        className="rounded-full border-[3px] border-black bg-white px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.14em] text-black transition hover:-translate-y-0.5 hover:bg-[#fff6cf]"
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
