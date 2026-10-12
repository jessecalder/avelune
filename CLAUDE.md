# Avelune — notes for agents

Next.js 16.4 (App Router, Turbopack, **cacheComponents on**), React 19.3, TypeScript strict, Tailwind v4 via `@tailwindcss/turbopack` (no postcss config), pnpm 10, Node 20.

## Verify
`pnpm typecheck && pnpm lint && pnpm test && pnpm build`

## Gotchas (this Next version differs from training data — see node_modules/next/dist/docs)
- `await headers()`, `await cookies()`, `await params`, `await searchParams`. Use `PageProps<'/'>` / `LayoutProps<'/'>` globals.
- cacheComponents: no `Date.now()`, `Math.random()`, `crypto.randomUUID()` or uncached IO during **render**. Fine inside server actions, stores, scripts.
- Server actions live in files starting with `'use server'`; `useActionState` from `react` gives `(prevState, formData)`; `useFormStatus` from `react-dom` inside the form. Return plain objects, never throw for validation.
- Read `formData.get('field')` explicitly (`Object.fromEntries` includes `$ACTION_*` keys).
- `next/image`: use `preload`, not `priority`; `fill` needs a `relative` parent and `sizes`; `images.qualities` is restricted to `[60, 75, 85]`. Unsplash photos go through the loader in `src/components/Photo.tsx` (never `plus.unsplash.com`).
- Tailwind v4: tokens in `src/app/globals.css` `@theme`; next/font variables are referenced via `var(--font-…)`; custom utilities are `@utility` blocks (`display`, `display-italic`, `wordmark`, `eyebrow`, `measure`, `reveal`).
- Motion is CSS only (`animate-rise`, `animate-fade`, `animate-settle`, `reveal`). No JS animation libraries; respect `prefers-reduced-motion` (handled globally).
- zod 4: `z.email()`, `{ error: '…' }`, `safeParse`.
- Drizzle: `postgres(url, { prepare: false })`; `pnpm db:generate` needs no DB.
- `next build` does not lint; run `pnpm lint`.

## Content rules
- Copy in `src/content/site.ts`, photos in `src/content/photos.ts`. Components never hard-code marketing copy.
- No exclamation marks, no "unforgettable"/"once in a lifetime"/"nestled", no invented venues, prices or testimonials. Avelune is new; say so where it matters.
- Children in stock photography must not be identifiable (from behind, distant, silhouette).
