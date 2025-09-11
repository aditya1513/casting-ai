import type { LinksFunction, MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from '@remix-run/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ClerkApp, ClerkLoaded, ClerkLoading } from '@clerk/remix';
import { rootAuthLoader } from '@clerk/remix/ssr.server';
import './globals.css';
import { trpc, trpcClient } from '~/lib/trpc';

export const links: LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap',
  },
  { rel: 'manifest', href: '/manifest.json' },
  { rel: 'icon', href: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png' },
  { rel: 'icon', href: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
  { rel: 'icon', href: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
  { rel: 'icon', href: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
  { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png', sizes: '180x180' },
  { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon-152x152.png', sizes: '152x152' },
  { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon-120x120.png', sizes: '120x120' },
  { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon-76x76.png', sizes: '76x76' },
  { rel: 'mask-icon', href: '/icons/safari-pinned-tab.svg', color: '#8b5cf6' },
];

export const meta: MetaFunction = () => [
  { charset: 'utf-8' },
  { title: "CastMatch - Mumbai's Premier Casting Platform" },
  { name: 'viewport', content: 'width=device-width,initial-scale=1' },
  {
    name: 'description',
    content:
      'Connect actors with casting directors for OTT projects in Mumbai. Find your next role or discover talent for your production.',
  },
  { name: 'keywords', content: 'casting, actors, Mumbai, OTT, entertainment, auditions, talent' },
  { name: 'author', content: 'CastMatch' },
  { name: 'theme-color', content: '#8b5cf6' },
  { name: 'apple-mobile-web-app-capable', content: 'yes' },
  { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
  { name: 'apple-mobile-web-app-title', content: 'CastMatch' },
  { name: 'application-name', content: 'CastMatch' },
  { property: 'og:title', content: 'CastMatch - Elite Casting Platform' },
  {
    property: 'og:description',
    content: "AI-powered casting platform for Mumbai's entertainment industry",
  },
  { property: 'og:url', content: 'https://castmatch.app' },
  { property: 'og:site_name', content: 'CastMatch' },
  { property: 'og:locale', content: 'en_IN' },
  { property: 'og:type', content: 'website' },
  { property: 'og:image', content: '/og-image.png' },
  { property: 'og:image:width', content: '1200' },
  { property: 'og:image:height', content: '630' },
  { property: 'og:image:alt', content: 'CastMatch Platform' },
  { name: 'twitter:card', content: 'summary_large_image' },
  { name: 'twitter:title', content: 'CastMatch - Elite Casting Platform' },
  {
    name: 'twitter:description',
    content: "AI-powered casting platform for Mumbai's entertainment industry",
  },
  { name: 'twitter:image', content: '/twitter-image.png' },
];

export const loader = (args: LoaderFunctionArgs) => {
  return rootAuthLoader(args, () => {
    return json({
      ENV: {
        CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
      },
    });
  });
};

// export const ErrorBoundary = ClerkErrorBoundary(); // Disabled due to CommonJS import issue

function Document({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <Meta />
        <Links />
      </head>
      <body className="font-geist antialiased bg-slate-900">
        {children}
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

function App() {
  const { ENV } = useLoaderData<typeof loader>();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000, // 5 seconds
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <Document>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <Outlet />
        </QueryClientProvider>
      </trpc.Provider>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.ENV = ${JSON.stringify(ENV)}`,
        }}
      />
    </Document>
  );
}

export default ClerkApp(App);
