import { useCallback, useState } from "react";
import { trackEvent } from "../lib/trackEvent";
import { useToast } from "../components/common/Toast";

export function useErrorHandler(options = {}) {
  const { context = "unknown", showToastOnError = true } = options;
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const formatErrorMessage = useCallback((response) => {
    if (!response) {
      return "An unexpected error occurred. Please try again.";
    }

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

  const handleError = useCallback(
    (response, eventName) => {
      const errorMessage = formatErrorMessage(response);

      setError({
        message: errorMessage,
        status: response?.status,
        code: response?.error,
        requestId: response?.requestId,
      });

      if (showToastOnError) {
        showToast(errorMessage, "error");
      }

      if (eventName) {
        trackEvent(eventName, {
          context,
          status: response?.status,
          errorCode: response?.error,
          requestId: response?.requestId,
        });
      }

      return errorMessage;
    },
    [context, formatErrorMessage, showToastOnError, showToast]
  );

  const wrapAsync = useCallback(
    async (asyncFn, asyncOptions = {}) => {
      const {
        onSuccess,
        onError,
        successEvent,
        errorEvent,
        loadingState = true,
      } = asyncOptions;

      if (loadingState) {
        setIsLoading(true);
      }
      clearError();

      try {
        const response = await asyncFn();

        if (response?.ok) {
          if (successEvent) {
            trackEvent(successEvent, { context });
          }
          if (onSuccess) {
            onSuccess(response);
          }
          return { success: true, data: response };
        }

        const errorMessage = handleError(response, errorEvent);
        if (onError) {
          onError(response, errorMessage);
        }
        return { success: false, error: errorMessage, response };
      } catch {
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

  const handleSuccess = useCallback(
    (message) => {
      showToast(message, "success");
    },
    [showToast]
  );

  const handleWarning = useCallback(
    (message) => {
      showToast(message, "warning");
    },
    [showToast]
  );

  const handleInfo = useCallback(
    (message) => {
      showToast(message, "info");
    },
    [showToast]
  );

  return {
    error,
    isLoading,
    setError,
    clearError,
    handleError,
    wrapAsync,
    formatErrorMessage,
    handleSuccess,
    handleWarning,
    handleInfo,
  };
}
