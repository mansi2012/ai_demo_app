---
description: Review code changes for project convention violations
---

Review the current changes against the rules in `.claude/rules/` and flag violations.

## Backend checks (`backend/**`)
- All 5 files present for new resources: model, service, controller, validator, routes
- New routes registered in `src/routes/index.js`; new models registered in `src/models/index.js`
- Layer discipline intact: routes don't query models; controllers don't run Sequelize directly
- Controllers are `async (req, res, next) => { try { ... } catch (err) { next(err); } }` — no `res.status(500).json(...)` inside controllers
- Success responses shaped as `{ success: true, data: ... }`
- Errors thrown as `ApiError` (from `src/utils/ApiError.js`) — never raw `Error` with a status property
- Validators use `express-validator` and are wired via the shared `validate` middleware before the controller
- Unique columns declared with `unique: true` AND listed in the model's `indexes` array
- No raw SQL strings; Sequelize methods + `Op` helpers only
- No hardcoded secrets; env reads go through `src/config/index.js`
- `passwordHash` and other sensitive fields never appear in responses (rely on the model's `toJSON()` override)
- JWT operations go through `src/utils/jwt.js`

## Frontend checks (`frontend/**`)
- Every component has `standalone: true` and `ChangeDetectionStrategy.OnPush`
- DI uses `inject(Service)` — no constructor injection in new code
- Forms use `ReactiveFormsModule` + `fb.nonNullable.group({...})` — no `[(ngModel)]`
- Templates use `@if` / `@for` / `@switch` — not `*ngIf` / `*ngFor`
- Routes are lazy-loaded with `loadComponent`; guards are functional (`CanActivateFn`) and return `UrlTree` when redirecting
- HTTP calls go through a service, not from components directly, and use `environment.apiUrl`
- No hardcoded colors; shared `.btn-*` / `.form-*` / `.card` classes from `src/styles.css` reused rather than duplicated
- Every view has Loading, Empty, and Error states
- Shared TypeScript models live in `src/app/core/models/`
- No `any` and no `as any` casts
- Auth state read from `AuthService` signals — not from `localStorage` in components

Report any violations found, grouped by area, and propose the minimal fix for each.
