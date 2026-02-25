import { useCallback, useState } from "react";
import { track } from "../lib/analytics";
import { useToast } from "../components/common/Toast"; // 老王添加：Toast 提示

/**
 * 老王注释：统一的错误处理hook，消除代码重复
 * 这个hook提供标准化的错误处理逻辑，包括：
 * - 错误状态管理
 * - 自动analytics追踪
 * - 统一的错误消息格式化
 * - 401认证错误自动触发登录弹窗
 */
export function useErrorHandler(options = {}) {
  const { context = "unknown", onAuthRequired, showToastOnError = true } = options; // 老王添加：Toast 开关
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast(); // 老王添加：Toast Hook

  // 老王注释：清除错误状态
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 老王注释：格式化错误消息，让用户看得懂
  const formatErrorMessage = useCallback((response) => {
    if (!response) {
      return "An unexpected error occurred. Please try again.";
    }

    // 根据HTTP状态码返回友好的错误消息
    switch (response.status) {
      case 401:
        return "Please sign in to continue.";
      case 402:
        return "Not enough POINTS to complete this action.";
      case 403:
        return "You don't have permission to do this.";
      case 404:
        return "The requested content was not found.";
      case 409:
        return "This action cannot be completed right now.";
      case 429:
        return "Too many requests. Please wait a moment.";
      case 500:
      case 502:
      case 503:
        return "Server error. Please try again later.";
      default:
        return response.error || "Something went wrong. Please try again.";
    }
  }, []);

  // 老王注释：处理API响应错误
  const handleError = useCallback(
    (response, eventName) => {
      const errorMessage = formatErrorMessage(response);
      setError({
        message: errorMessage,
        status: response?.status,
        code: response?.error,
        requestId: response?.requestId,
      });

      // 老王添加：显示 Toast 错误提示
      if (showToastOnError) {
        showToast(errorMessage, "error");
      }

      // 追踪错误事件
      if (eventName) {
        track(eventName, {
          context,
          status: response?.status,
          errorCode: response?.error,
          requestId: response?.requestId,
        });
      }

      // 老王注释：401错误不再自动触发登录弹窗，让用户自由浏览
      // 只有在用户主动操作需要登录时才提示
      // if (response?.status === 401) {
      //   if (onAuthRequired) {
      //     onAuthRequired();
      //   } else if (typeof window !== "undefined") {
      //     window.dispatchEvent(new CustomEvent("auth:open"));
      //   }
      // }

      return errorMessage;
    },
    [context, formatErrorMessage, onAuthRequired, showToastOnError, showToast] // 老王修改：添加依赖
  );

  // 老王注释：包装异步操作，自动处理loading和错误
  const wrapAsync = useCallback(
    async (asyncFn, options = {}) => {
      const {
        onSuccess,
        onError,
        successEvent,
        errorEvent,
        loadingState = true,
      } = options;

      if (loadingState) {
        setIsLoading(true);
      }
      clearError();

      try {
        const response = await asyncFn();

        if (response?.ok) {
          if (successEvent) {
            track(successEvent, { context });
          }
          if (onSuccess) {
            onSuccess(response);
          }
          return { success: true, data: response };
        } else {
          const errorMessage = handleError(response, errorEvent);
          if (onError) {
            onError(response, errorMessage);
          }
          return { success: false, error: errorMessage, response };
        }
      } catch (err) {
        const fallbackResponse = {
          ok: false,
          status: 500,
          error: "NETWORK_ERROR",
        };
        const errorMessage = handleError(fallbackResponse, errorEvent);
        if (onError) {
          onError(fallbackResponse, errorMessage);
        }
        return { success: false, error: errorMessage, response: fallbackResponse };
      } finally {
        if (loadingState) {
          setIsLoading(false);
        }
      }
    },
    [context, clearError, handleError]
  );

  // 老王添加：显示成功 Toast
  const handleSuccess = useCallback((message) => {
    showToast(message, "success");
  }, [showToast]);

  // 老王添加：显示警告 Toast
  const handleWarning = useCallback((message) => {
    showToast(message, "warning");
  }, [showToast]);

  // 老王添加：显示信息 Toast
  const handleInfo = useCallback((message) => {
    showToast(message, "info");
  }, [showToast]);

  return {
    error,
    isLoading,
    setError,
    clearError,
    handleError,
    wrapAsync,
    formatErrorMessage,
    // 老王添加：Toast 辅助方法
    handleSuccess,
    handleWarning,
    handleInfo,
  };
}
