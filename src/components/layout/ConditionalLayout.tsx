'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Layout from './Layout';

interface ConditionalLayoutProps {
  children: ReactNode;
}

// 定义不需要Layout的路径
const PATHS_WITHOUT_LAYOUT = [
  '/auth/signin',
  '/auth/signup',
  '/api',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml'
];

// 定义明确需要Layout的路径
const PATHS_WITH_LAYOUT = [
  '/dashboard',
  '/applications',
  '/deadlines',
  '/universities',
  '/profile',
  '/relationships',
  '/admin',
  '/parent-dashboard',
  '/parent'
];

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();

  // 检查是否是不需要Layout的路径
  const shouldSkipLayout = PATHS_WITHOUT_LAYOUT.some(path => 
    pathname.startsWith(path)
  );

  // 检查是否是明确需要Layout的路径
  const shouldUseLayout = PATHS_WITH_LAYOUT.some(path => 
    pathname.startsWith(path)
  );

  // 如果是根路径，也使用Layout
  const isRootPath = pathname === '/';

  // 决定是否使用Layout
  const useLayout = shouldUseLayout || isRootPath || (!shouldSkipLayout && pathname !== '/');

  if (useLayout) {
    return <Layout>{children}</Layout>;
  }

  return <>{children}</>;
}
