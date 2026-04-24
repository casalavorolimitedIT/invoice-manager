'use client';
import dynamic from 'next/dynamic';
const DevToolbar = dynamic(
  () => import('next-dev-toolbar').then((m) => ({ default: m.DevToolbar })).catch(() => ({ default: () => null })),
  { ssr: false },
);
export function DevToolbarWrapper() {
  if (process.env.NODE_ENV !== 'development') return null;
  return <DevToolbar />;
}
