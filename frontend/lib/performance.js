"use client";

import { useEffect } from "react";
import { trackEvent } from "./trackEvent";

export function reportWebVitals(metric) {
  trackEvent("web_vitals", {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
  });

  if (process.env.NODE_ENV === "development") {
    console.log(`[Performance] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
    });
  }
}

export function usePerformanceMonitor(componentName) {
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      trackEvent("component_render_time", {
        component: componentName,
        duration: Math.round(duration),
      });

      if (process.env.NODE_ENV === "development" && duration > 100) {
        console.warn(
          `[Performance Warning] ${componentName} took ${Math.round(duration)}ms to render`
        );
      }
    };
  }, [componentName]);
}

export function measurePerformance(fn, label) {
  return async function measured(...args) {
    const startTime = performance.now();

    try {
      const result = await fn(...args);
      const duration = performance.now() - startTime;
      trackEvent("function_execution_time", {
        function: label || fn.name,
        duration: Math.round(duration),
      });

      if (process.env.NODE_ENV === "development") {
        console.log(`[Performance] ${label || fn.name}: ${Math.round(duration)}ms`);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      trackEvent("function_execution_error", {
        function: label || fn.name,
        duration: Math.round(duration),
        error: error?.message || "UNKNOWN_ERROR",
      });
      throw error;
    }
  };
}

export function monitorApiRequest(url, options = {}) {
  const startTime = performance.now();

  return {
    end: (response) => {
      const duration = performance.now() - startTime;

      trackEvent("api_request_time", {
        url,
        method: options.method || "GET",
        status: response?.status || 0,
        duration: Math.round(duration),
        cached: response?.cached || false,
      });

      if (process.env.NODE_ENV === "development") {
        const statusColor = response?.ok ? "\x1b[32m" : "\x1b[31m";
        console.log(
          `[API] ${statusColor}${response?.status || "ERR"}\x1b[0m ${url} - ${Math.round(duration)}ms`
        );
      }
    },
  };
}

export function PerformanceMonitor({ children }) {
  useEffect(() => {
    if (typeof window !== "undefined" && window.performance) {
      const navigation = performance.getEntriesByType("navigation")[0];
      if (navigation) {
        trackEvent("page_load_performance", {
          domContentLoaded: Math.round(
            navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
          ),
          loadComplete: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
          domInteractive: Math.round(navigation.domInteractive - navigation.fetchStart),
          ttfb: Math.round(navigation.responseStart - navigation.requestStart),
        });
      }
    }

    if (typeof window !== "undefined" && performance.memory) {
      const memoryInfo = performance.memory;
      trackEvent("memory_usage", {
        usedJSHeapSize: Math.round(memoryInfo.usedJSHeapSize / 1048576),
        totalJSHeapSize: Math.round(memoryInfo.totalJSHeapSize / 1048576),
        jsHeapSizeLimit: Math.round(memoryInfo.jsHeapSizeLimit / 1048576),
      });
    }

    if (typeof window !== "undefined" && "PerformanceObserver" in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              trackEvent("long_task", {
                duration: Math.round(entry.duration),
                startTime: Math.round(entry.startTime),
              });

              if (process.env.NODE_ENV === "development") {
                console.warn(
                  `[Performance Warning] Long task detected: ${Math.round(entry.duration)}ms`
                );
              }
            }
          }
        });

        observer.observe({ entryTypes: ["longtask"] });
        return () => observer.disconnect();
      } catch {
        // ignore unsupported browser implementations
      }
    }

    return undefined;
  }, []);

  return children;
}
