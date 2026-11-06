import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { workspaceLayoutFromCookie } from '../lib/workspace-layout';
import { WorkspacePreferenceSync } from './WorkspaceSettings';
import type { ReactNode } from 'react';
import './globals.css';
import { SupportLauncher } from './SupportLauncher';
import { AcquisitionAnalytics } from './AcquisitionAnalytics';
import { counterId } from '../lib/acquisition-analytics';
import { readEnvironment } from '../server/environment';
import { THEME_COLOR } from '../lib/theme';
import { requestTheme } from './theme-server';
// cookies/headers make every page dynamic; `/` loses static prerender on purpose (SSR theme, no flash).
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'КлипМейкер' };
export async function generateViewport(): Promise<Viewport> {
  const theme = await requestTheme();
  return { width: 'device-width', initialScale: 1, viewportFit: 'cover', colorScheme: theme, themeColor: THEME_COLOR[theme] };
}
export default async function Layout({ children }: { children: ReactNode }) {
  const theme = await requestTheme();
  const layout = workspaceLayoutFromCookie((await headers()).get('cookie') ?? undefined);
  const env = readEnvironment();
  return <html lang="ru" data-theme={theme} data-workspace-layout={layout}><body><WorkspacePreferenceSync initialLayout={layout} initialTheme={theme} />{children}<SupportLauncher /><AcquisitionAnalytics counter={counterId(env.N5_METRIKA_COUNTER_ID)} /></body></html>;
}
