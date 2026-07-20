# Frontend Performance Patterns

## Core Web Vitals Targets
- **LCP (Largest Contentful Paint):** < 2.5s. Optimize: preload hero image, inline critical CSS, server-side render above fold.
- **INP (Interaction to Next Paint):** < 200ms. Optimize: minimize main thread work, use Web Workers for computation, avoid layout thrash.
- **CLS (Cumulative Layout Shift):** < 0.1. Optimize: set explicit dimensions on images/embeds, reserve space for async content, avoid inserting content above viewport.

## Code Splitting
- Route-based: each page/route is a separate chunk (React.lazy + Suspense)
- Component-based: heavy components loaded on demand (modals, charts, editors)
- Library splitting: large deps in separate chunk (moment.js, lodash, chart.js)
- Prefetch: on hover/focus, prefetch the likely-next-navigation chunk

## Critical Rendering Path
- Inline critical CSS: above-the-fold styles in <style> tag (eliminates render-blocking request)
- Async load remaining CSS: <link rel="preload" as="style" onload="this.rel='stylesheet'">
- Defer non-critical JS: <script defer> (don't block DOM parsing)
- Preconnect to API origins: <link rel="preconnect" href="https://api.example.com">

## Image Optimization
- Modern formats: WebP (90% browser support), AVIF (better compression, growing support), PNG/JPEG fallback
- Responsive: srcset with width descriptors (serve appropriate size per viewport)
- Lazy loading: loading="lazy" for below-fold images (native browser support)
- Placeholder: blur-up or solid color placeholder during load (prevents CLS)
- CDN: serve images from CloudFront/Imgix with on-the-fly resize

## Font Loading
- font-display: swap (show fallback immediately, swap when loaded — prevents FOIT)
- Preload critical fonts: <link rel="preload" as="font" type="font/woff2" crossorigin>
- Subset: only include characters needed (Latin subset for English-only)
- System font stack fallback: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif

## Virtualization
- Large lists (>100 items): virtual scroll (react-window, @tanstack/virtual)
- Only render visible items + small buffer (10 above/below viewport)
- Fixed row height preferred (simpler calculation), variable height supported with measurement

## Service Workers
- Static assets: cache-first (serve from cache, update in background)
- API responses: network-first (fresh data preferred, cache as fallback)
- Semi-dynamic (feed, dashboard): stale-while-revalidate (serve cache instantly, refresh behind)
- Precache: critical route shells on install (instant navigation)

## Bundle Analysis
- Analyze: webpack-bundle-analyzer, source-map-explorer
- Budget: main bundle < 200KB gzipped (alert if exceeded)
- Tree shaking: use ES modules (import/export), mark sideEffects:false in package.json
- Avoid: importing entire library for one function (import { debounce } from 'lodash/debounce')
