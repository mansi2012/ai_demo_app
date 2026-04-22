---
description: Scaffold a new frontend page at the Angular route "$ARGUMENTS"
---

Create a new Angular standalone page at the route "$ARGUMENTS" (e.g. `profile`, `dashboard/settings`).

Steps:
1. Create `frontend/src/app/pages/$ARGUMENTS/$ARGUMENTS.component.ts`
   - `standalone: true`
   - `changeDetection: ChangeDetectionStrategy.OnPush`
   - `imports: [CommonModule, ReactiveFormsModule, ...]` — only what the template actually uses
   - `templateUrl: './$ARGUMENTS.component.html'` once the template grows past a few lines
   - DI via `inject(Service)` — no constructor injection
   - Use signals for local state and `computed()` for derived state
2. Create `frontend/src/app/pages/$ARGUMENTS/$ARGUMENTS.component.html`
   - Use `@if` / `@for` / `@switch` — not `*ngIf` / `*ngFor`
   - Reuse the shared `.btn-primary`, `.btn-ghost`, `.form-input`, `.form-label`, `.form-error`, `.card` classes from `src/styles.css`
   - Handle Loading, Empty, and Error states explicitly
3. Register the route in `frontend/src/app/app.routes.ts`:
   - `loadComponent: () => import('./pages/$ARGUMENTS/$ARGUMENTS.component').then(m => m.$COMPONENT)`
   - Add `canActivate: [authGuard]` for protected pages or `[guestGuard]` for auth-only pages
4. If the page talks to the backend, add methods to an existing service in `frontend/src/app/core/services/` or create a new one there. Never call `HttpClient` from a component. Use `environment.apiUrl` as the base URL.
5. If a request/response shape is new, add the interfaces to `frontend/src/app/core/models/` and reuse them on both the service and the form value type.
6. If a reusable UI chunk appears (e.g. a shell, a card variant), consider extracting it into `frontend/src/app/shared/` as a standalone component — follow `AuthShellComponent` as the pattern.

Follow all rules in `.claude/rules/frontend-rules.md` and `.claude/rules/styling-rules.md`.
