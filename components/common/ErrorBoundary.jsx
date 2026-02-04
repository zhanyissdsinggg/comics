/**
 * React错误边界组件
 * 用于捕获子组件树中的JavaScript错误，记录错误并显示降级UI
 */

"use client";

import { Component } from 'react';
import { track } from '../../lib/analytics';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // 更新state，下次渲染将显示降级UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 记录错误到错误追踪服务
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // 追踪错误
    track('error_boundary_triggered', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      errorBoundary: this.props.name || 'unnamed',
    });

    // 更新state
    this.setState({
      error,
      errorInfo,
    });

    // 如果提供了onError回调，调用它
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

    // 如果提供了onReset回调，调用它
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          reset: this.handleReset,
        });
      }

      // 默认降级UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4">
          <div className="max-w-md w-full">
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
                    {this.props.title || 'Something went wrong'}
                  </h3>
                  <p className="mt-2 text-sm text-red-300">
                    {this.props.message ||
                      'An unexpected error occurred. Please try again.'}
                  </p>

                  {process.env.NODE_ENV === 'development' && this.state.error && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-xs text-red-400 hover:text-red-300">
                        Error details (dev only)
                      </summary>
                      <pre className="mt-2 overflow-auto rounded bg-neutral-900 p-2 text-[10px] text-red-300">
                        {this.state.error.toString()}
                        {'\n\n'}
                        {this.state.errorInfo?.componentStack}
                      </pre>
                    </details>
                  )}

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

/**
 * 使用示例：
 *
 * // 基础用法
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 *
 * // 自定义标题和消息
 * <ErrorBoundary
 *   title="Failed to load reader"
 *   message="We couldn't load the reader. Please try again."
 * >
 *   <ReaderPage />
 * </ErrorBoundary>
 *
 * // 自定义fallback UI
 * <ErrorBoundary
 *   fallback={({ error, reset }) => (
 *     <div>
 *       <h1>Custom error UI</h1>
 *       <button onClick={reset}>Reset</button>
 *     </div>
 *   )}
 * >
 *   <YourComponent />
 * </ErrorBoundary>
 *
 * // 带错误回调
 * <ErrorBoundary
 *   name="ReaderBoundary"
 *   onError={(error, errorInfo) => {
 *     // 发送到错误追踪服务
 *     console.error('Reader error:', error);
 *   }}
 *   onReset={() => {
 *     // 重置时的清理逻辑
 *     console.log('Error boundary reset');
 *   }}
 * >
 *   <ReaderPage />
 * </ErrorBoundary>
 */
