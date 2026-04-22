# CLAUDE.md — frontend

Conventions for the `frontend/` directory. Read this before writing or editing code here, together with [.claude/rules/frontend-rules.md](../.claude/rules/frontend-rules.md) and [.claude/rules/styling-rules.md](../.claude/rules/styling-rules.md).

## Stack

- Angular 19 — standalone components only (no NgModules)
- TypeScript strict mode
- Tailwind CSS v3 (classic `@tailwind base; @tailwind components; @tailwind utilities;` syntax)
- Reactive Forms (`ReactiveFormsModule`, `FormBuilder.nonNullable`)
- Signals for local/derived state
- `HttpClient` with functional interceptors
- RxJS only where async streams actually help (HTTP, events)

## Directory layout

```
frontend/
├── angular.json
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json / tsconfig.app.json
└── src/
    ├── index.html
    ├── main.ts                    # bootstrapApplication(AppComponent, appConfig)
    ├── styles.css                 # @tailwind directives + @layer components (.btn-*, .form-*, .card)
    ├── environments/
    │   ├── environment.ts                  # production
    │   └── environment.development.ts      # { apiUrl: 'http://localhost:3000/api' }
    └── app/
        ├── app.component.ts       # top-level, just <router-outlet />
        ├── app.config.ts          # provideRouter, provideHttpClient, interceptors
        ├── app.routes.ts          # lazy loadComponent + guards
        ├── core/
        │   ├── services/          # AuthService (signals-based)
        │   ├── guards/            # authGuard, guestGuard (functional CanActivateFn)
        │   ├── interceptors/      # authInterceptor (functional)
        │   └── models/            # shared TS interfaces (User, AuthResponse, ApiErrorBody, ...)
        ├── shared/                # reusable standalone components (e.g. AuthShellComponent)
        └── pages/
            ├── login/
            ├── register/
            └── home/
```

## Component conventions

- Every component has:
  - `standalone: true`
  - `changeDetection: ChangeDetectionStrategy.OnPush`
  - `imports: [...]` with only what the template uses
- Use `templateUrl` / separate `.html` file once the template is more than a few lines; inline `template: \`...\`` is fine for trivial cases (e.g. `AppComponent`, `AuthShellComponent`)
- DI via `private readonly svc = inject(Service)` — no constructor injection
- Local state via `signal()` / `computed()`; expose read-only signals to templates (`readonly user = this._user.asReadonly()`)
- Templates use `@if`, `@for`, `@switch` — not `*ngIf` / `*ngFor`

## Routing

- Every page is lazy-loaded in `app.routes.ts` via `loadComponent: () => import(...)`
- Guards are functional (`CanActivateFn`) and return a `UrlTree` (`router.createUrlTree([...])`) for redirects — not `false`
- Use `authGuard` for protected routes, `guestGuard` for login/register (redirects logged-in users away)
- `provideRouter(appRoutes, withComponentInputBinding())` in `app.config.ts` — component inputs bind to route params automatically

## Forms

- Reactive forms only — `fb.nonNullable.group({...})` so values are strictly non-null
- Validators on the client (`Validators.required`, `Validators.minLength`, ...) for UX, but the backend is the source of truth
- When the server returns field-level errors in `details: [{ field, message }]`, map them onto the corresponding form controls (see `RegisterComponent.controlError` for the pattern)
- Show validation errors only after the control is touched/dirty

## HTTP / API

- All HTTP calls go through a service under `src/app/core/services/`, never from a component directly
- Base URL comes from `environment.apiUrl` — never hardcode `http://localhost:...`
- Auth token is attached by `authInterceptor` (registered in `app.config.ts` via `withInterceptors([authInterceptor])`)
- 401 responses trigger `auth.logout()` + redirect to `/login` (already wired in `authInterceptor` — don't duplicate)
- Shared response types (`ApiSuccess<T>`, `ApiErrorBody`) live in `src/app/core/models/user.model.ts`

## Auth state

- Single source of truth: `AuthService` (`src/app/core/services/auth.service.ts`)
- Exposes:
  - `user` — read-only signal of the current `User | null`
  - `isAuthenticated` — computed signal
  - `getToken()` — for the interceptor
- Components read auth state via these signals — never touch `localStorage` directly
- `login()` / `register()` / `logout()` handle persistence internally

## Styling

- Tailwind v3 with shared `@layer components` classes in `src/styles.css`:
  - `.btn`, `.btn-primary`, `.btn-ghost`
  - `.form-input`, `.form-label`, `.form-error`
  - `.card`
- Reuse these before writing long utility strings; add new ones to `styles.css` when a pattern repeats
- Colors only from the `brand` palette in `tailwind.config.js` + Tailwind's defaults (`slate`, `rose`, etc.) — no hardcoded hex/rgb
- Every interactive element needs a visible focus ring (built into `.btn` and `.form-input`)
- See [.claude/rules/styling-rules.md](../.claude/rules/styling-rules.md) for the full list

## Adding a new page

Use the `/new-page` command, or follow [.claude/commands/new-page.md](../.claude/commands/new-page.md):

1. `src/app/pages/<name>/<name>.component.ts` (+ `.component.html`)
2. Register in `app.routes.ts` with `loadComponent` and the correct guard
3. If the page calls the backend, add methods to a service in `core/services/`
4. If new request/response shapes appear, add interfaces in `core/models/`
