'use client';
import posthog from 'posthog-js';

declare global { interface Window { __PH_INIT?: boolean } }

export function initAnalytics() {
  if (typeof window === 'undefined') return;
  if (window.__PH_INIT) return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return; // no key locally? skip init safely

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
  });
  window.__PH_INIT = true;
}

export { posthog };
