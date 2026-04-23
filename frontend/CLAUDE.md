# CLAUDE.md — frontend

Conventions for the `frontend/` directory. Read this before writing or editing code here, together with [.claude/rules/frontend-rules.md](../.claude/rules/frontend-rules.md) and [.claude/rules/styling-rules.md](../.claude/rules/styling-rules.md).

## Stack

- Next.js 15 (App Router) — TypeScript strict mode
- React 19 — functional components only
- Tailwind CSS v3 (classic `@tailwind base; @tailwind components; @tailwind utilities;` syntax)
- React Hook Form + Zod for form validation (client-side)
- Zustand for global state (auth)
- `fetch` / custom HTTP client for API calls with Bearer auth interceptor

## Directory layout

```
frontend/
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
└── src/
    ├── app/
    │   ├── layout.tsx                 # root layout (metadata, providers)
    │   ├── (auth)/                    # route group for login/register
    │   │   ├── login/
    │   │   │   └── page.tsx           # login form + SocialLoginButtons
    │   │   ├── register/
    │   │   │   └── page.tsx           # registration form
    │   │   └── layout.tsx             # optional: shared auth layout
    │   └── dashboard/
    │       └── page.tsx               # protected dashboard
    ├── components/
    │   ├── auth/
    │   │   └── SocialLoginButtons.tsx # Google + Facebook button stubs
    │   └── shared/                    # reusable components
    ├── lib/
    │   ├── api-client.ts              # fetch wrapper with Bearer interceptor
    │   ├── stores/
    │   │   └── auth-store.ts          # Zustand auth store (user, token, login/logout)
    │   └── utils/
    ├── styles/
    │   └── globals.css                # @tailwind + @layer components
    └── middleware.ts                  # optional: Next.js middleware for auth checks
```

## Component conventions

- Every component is a function component with `'use client'` at the top (since we use client-side state / forms)
- Use `React.ReactNode` / `React.ReactElement` for typing children and JSX returns
- DI via props or global stores (Zustand) — no circular imports
- Forms use `react-hook-form` + `Zod` validators
  - Register inputs with `{...register('fieldName')}`
  - Display field errors only after the field is touched/dirty
  - Use `zod` schema to validate shape; `react-hook-form` applies it via `zodResolver`
- Reuse Tailwind component classes from `src/styles/globals.css` (`.btn`, `.btn-primary`, `.form-input`, `.card`, etc.)

## Routing (Next.js App Router)

- Use route groups `(auth)`, `(dashboard)` to organize pages without affecting URL structure
- Protected routes (e.g., `/dashboard`) should check auth state in the page component or via a wrapper; a middleware can also redirect to `/login` if no token
- Lazy loading happens automatically; use `dynamic()` from `next/dynamic` for large components if needed
- Route params are passed to page components via `params` and `searchParams` props

## Forms

- Use `react-hook-form` with `useForm<T>()` where `T` is typed by `Zod.infer<typeof schema>`
- Validators in a `const schema = z.object({...})` at the top of the file or in a separate `validators/` file
- Pass `zodResolver(schema)` to `useForm()` for automatic validation
- Wire form with `handleSubmit(onSubmit)` on the form element
- Show field-level errors from `errors.<field>?.message` only if `isDirty` or `isTouched`
- For server-side errors (e.g., "email already exists"), use `setError('root', { message: "..." })` to show a banner

## HTTP / API

- All API calls go through `src/lib/api-client.ts` (a `fetch` wrapper)
- Base URL comes from env (see `next.config.js` / `.env.local`) — never hardcode localhost
- Bearer token is attached automatically by the `apiClient` interceptor; it reads from Zustand store
- 401 responses trigger `authStore.logout()` + redirect to `/login` (wired in `api-client.ts`)
- Request/response shapes (User, AuthResponse, etc.) are typed in `src/lib/models.ts` or co-located with the store

## Auth state (Zustand)

- Single source of truth: `src/lib/stores/auth-store.ts`
- Exposes:
  - `user` — current `User | null`
  - `accessToken` — the JWT string (or null)
  - `isAuthenticated` — boolean computed from `user !== null`
  - `setAuth(user, token)` — called after successful login/register
  - `logout()` — clears state and localStorage
- Hydrate on mount from `localStorage` (handle SSR gracefully with `useEffect`)
- Components read auth state via `useAuthStore()` hook — never access `localStorage` directly

## Styling

- Tailwind v3 with shared `@layer components` classes in `src/styles/globals.css`:
  - `.btn`, `.btn-primary`, `.btn-ghost`
  - `.form-input`, `.form-label`, `.form-error`
  - `.card`
- Reuse these before writing long utility strings; add new ones to `globals.css` when a pattern repeats
- Colors only from the `brand` palette in `tailwind.config.ts` + Tailwind's defaults (`slate`, `rose`, etc.)
- Every interactive element needs a visible focus ring (built into `.btn` and `.form-input`)
- Use `aria-label`, `aria-live`, `role` attributes for accessibility

## Adding a new page

1. Create `src/app/<route>/page.tsx` (optionally under a route group like `(auth)`)
2. Mark it `'use client'` if it uses state, forms, or client-side interactions
3. If it calls the backend, add methods to `src/lib/stores/auth-store.ts` or a new service file
4. If new request/response shapes appear, add interfaces in `src/lib/models.ts`
5. Update the routing table in `frontend/README.md`
