/**
 * 性能监控工具
 * 使用Web Vitals API监控核心性能指标
 */

"use client";

import { useEffect } from 'react';
import { track } from './analytics';

/**
 * 监控Web Vitals指标
 * - LCP (Largest Contentful Paint): 最大内容绘制
 * - FID (First Input Delay): 首次输入延迟
 * - CLS (Cumulative Layout Shift): 累积布局偏移
 * - FCP (First Contentful Paint): 首次内容绘制
 * - TTFB (Time to First Byte): 首字节时间
 */
export function reportWebVitals(metric) {
  // 发送到分析服务
  track('web_vitals', {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
  });

  // 开发环境下打印到控制台
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
    });
  }
}

/**
 * 性能监控Hook
 * 在组件中使用以监控性能
 */
export function usePerformanceMonitor(componentName) {
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      // 记录组件渲染时间
      track('component_render_time', {
        component: componentName,
        duration: Math.round(duration),
      });

      if (process.env.NODE_ENV === 'development' && duration > 100) {
        console.warn(
          `[Performance Warning] ${componentName} took ${Math.round(duration)}ms to render`
        );
      }
    };
  }, [componentName]);
}

/**
 * 测量函数执行时间
 */
export function measurePerformance(fn, label) {
  return async function (...args) {
    const startTime = performance.now();

    try {
      const result = await fn(...args);
      const endTime = performance.now();
      const duration = endTime - startTime;

      track('function_execution_time', {
        function: label || fn.name,
        duration: Math.round(duration),
      });

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${label || fn.name}: ${Math.round(duration)}ms`);
      }

      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      track('function_execution_error', {
        function: label || fn.name,
        duration: Math.round(duration),
        error: error.message,
      });

      throw error;
    }
  };
}

/**
 * 监控API请求性能
 */
export function monitorApiRequest(url, options = {}) {
  const startTime = performance.now();

  return {
    end: (response) => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      track('api_request_time', {
        url,
        method: options.method || 'GET',
        status: response?.status || 0,
        duration: Math.round(duration),
        cached: response?.cached || false,
      });

      if (process.env.NODE_ENV === 'development') {
        const statusColor = response?.ok ? '\x1b[32m' : '\x1b[31m';
        console.log(
          `[API] ${statusColor}${response?.status || 'ERR'}\x1b[0m ${url} - ${Math.round(duration)}ms`
        );
      }
    },
  };
}

/**
 * 性能监控组件
 * 在应用根部使用以启用全局监控
 */
export function PerformanceMonitor({ children }) {
  useEffect(() => {
    // 监控页面加载性能
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0];

      if (navigation) {
        track('page_load_performance', {
          domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
          loadComplete: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
          domInteractive: Math.round(navigation.domInteractive - navigation.fetchStart),
          ttfb: Math.round(navigation.responseStart - navigation.requestStart),
        });
      }
    }

    // 监控内存使用（如果支持）
    if (typeof window !== 'undefined' && performance.memory) {
      const memoryInfo = performance.memory;
      track('memory_usage', {
        usedJSHeapSize: Math.round(memoryInfo.usedJSHeapSize / 1048576), // MB
        totalJSHeapSize: Math.round(memoryInfo.totalJSHeapSize / 1048576), // MB
        jsHeapSizeLimit: Math.round(memoryInfo.jsHeapSizeLimit / 1048576), // MB
      });
    }

    // 监控长任务（如果支持）
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              track('long_task', {
                duration: Math.round(entry.duration),
                startTime: Math.round(entry.startTime),
              });

              if (process.env.NODE_ENV === 'development') {
                console.warn(
                  `[Performance Warning] Long task detected: ${Math.round(entry.duration)}ms`
                );
              }
            }
          }
        });

        observer.observe({ entryTypes: ['longtask'] });

        return () => observer.disconnect();
      } catch (e) {
        // PerformanceObserver不支持longtask
      }
    }
  }, []);

  return children;
}

/**
 * 使用示例：
 *
 * // 1. 在app/layout.js中启用全局监控
 * import { PerformanceMonitor } from '@/lib/performance';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <PerformanceMonitor>
 *           {children}
 *         </PerformanceMonitor>
 *       </body>
 *     </html>
 *   );
 * }
 *
 * // 2. 在组件中监控渲染性能
 * import { usePerformanceMonitor } from '@/lib/performance';
 *
 * function MyComponent() {
 *   usePerformanceMonitor('MyComponent');
 *   return <div>...</div>;
 * }
 *
 * // 3. 测量函数执行时间
 * import { measurePerformance } from '@/lib/performance';
 *
 * const fetchData = measurePerformance(async () => {
 *   const response = await fetch('/api/data');
 *   return response.json();
 * }, 'fetchData');
 *
 * // 4. 监控API请求
 * import { monitorApiRequest } from '@/lib/performance';
 *
 * async function apiCall(url) {
 *   const monitor = monitorApiRequest(url);
 *   const response = await fetch(url);
 *   monitor.end(response);
 *   return response;
 * }
 *
 * // 5. 在app/page.js中报告Web Vitals
 * export { reportWebVitals } from '@/lib/performance';
 */
