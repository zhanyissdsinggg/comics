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
        <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-4">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-red-400"
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
                  <h3 className="text-lg font-semibold text-red-200">
                    {this.props.title || "Something went wrong"}
                  </h3>
                  <p className="mt-2 text-sm text-red-300">
                    {this.props.message ||
                      "An unexpected error occurred. Please try again."}
                  </p>

                  {process.env.NODE_ENV === "development" && this.state.error ? (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-xs text-red-400 hover:text-red-300">
                        Error details (dev only)
                      </summary>
                      <pre className="mt-2 overflow-auto rounded bg-neutral-900 p-2 text-[10px] text-red-300">
                        {this.state.error.toString()}
                        {"\n\n"}
                        {this.state.errorInfo?.componentStack}
                      </pre>
                    </details>
                  ) : null}

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={this.handleReset}
                      className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
                    >
                      Try again
                    </button>
                    <button
                      onClick={() => window.location.reload()}
                      className="rounded-full border border-red-500 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20"
                    >
                      Reload page
                    </button>
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
