'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const QueryProvider = dynamic(
  () => import('../../lib/queryProvider').then((module) => ({ default: module.QueryProvider })),
  { ssr: false }
);

export function QueryWrapper({ children }) {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <QueryProvider>{children}</QueryProvider>
    </Suspense>
  );
}
