'use client';

/**
 * 老王说：QueryProvider的动态包装器
 * 这个SB组件解决构建时导入QueryProvider的问题
 * 通过动态导入避免构建时评估React Query模块
 */

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// 动态导入QueryProvider，禁用SSR
const QueryProvider = dynamic(
  () => import('../../lib/queryProvider').then(mod => ({ default: mod.QueryProvider })),
  { ssr: false }
);

export function QueryWrapper({ children }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <QueryProvider>{children}</QueryProvider>
    </Suspense>
  );
}
