/**
 * 优化的图片懒加载组件
 * 使用Intersection Observer API实现高性能懒加载
 */

"use client";

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

export default function LazyImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality = 75,
  placeholder = 'blur',
  blurDataURL,
  onLoad,
  onError,
  ...props
}) {
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    // 如果是优先加载，直接显示
    if (priority) {
      setIsInView(true);
      return;
    }

    // 创建Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            // 一旦进入视口，就停止观察
            observer.unobserve(entry.target);
          }
        });
      },
      {
        // 提前200px开始加载
        rootMargin: '200px',
        threshold: 0.01,
      }
    );

    const currentRef = imgRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [priority]);

  const handleLoad = (e) => {
    setIsLoaded(true);
    if (onLoad) {
      onLoad(e);
    }
  };

  const handleError = (e) => {
    setHasError(true);
    if (onError) {
      onError(e);
    }
  };

  // 生成默认的blurDataURL
  const defaultBlurDataURL =
    blurDataURL ||
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzI2MjYyNiIvPjwvc3ZnPg==';

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {hasError ? (
        // 错误状态
        <div className="flex h-full w-full items-center justify-center bg-neutral-900">
          <svg
            className="h-12 w-12 text-neutral-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      ) : isInView || priority ? (
        // 加载图片
        <>
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            quality={quality}
            priority={priority}
            placeholder={placeholder}
            blurDataURL={defaultBlurDataURL}
            onLoad={handleLoad}
            onError={handleError}
            className={`transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            {...props}
          />
          {!isLoaded && (
            // 加载中的骨架屏
            <div className="absolute inset-0 animate-pulse bg-neutral-800" />
          )}
        </>
      ) : (
        // 占位符
        <div className="h-full w-full bg-neutral-900" />
      )}
    </div>
  );
}

/**
 * 使用示例：
 *
 * // 基础用法
 * <LazyImage
 *   src="/images/cover.jpg"
 *   alt="Series cover"
 *   width={300}
 *   height={400}
 * />
 *
 * // 优先加载（首屏图片）
 * <LazyImage
 *   src="/images/hero.jpg"
 *   alt="Hero image"
 *   width={1200}
 *   height={600}
 *   priority
 * />
 *
 * // 自定义质量和占位符
 * <LazyImage
 *   src="/images/cover.jpg"
 *   alt="Cover"
 *   width={300}
 *   height={400}
 *   quality={90}
 *   placeholder="blur"
 *   blurDataURL="data:image/..."
 * />
 *
 * // 带回调
 * <LazyImage
 *   src="/images/cover.jpg"
 *   alt="Cover"
 *   width={300}
 *   height={400}
 *   onLoad={() => console.log('Image loaded')}
 *   onError={() => console.log('Image failed')}
 * />
 */
