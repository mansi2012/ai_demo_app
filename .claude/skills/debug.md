---
description: Debug an issue by reading logs, tracing code flow, and identifying root cause
---

Debug the issue described by the user: "$ARGUMENTS"

Steps:
1. Identify which layer the issue is in:
   - Backend: route → controller → service → model → middleware → Sequelize
   - Frontend: page component → service → HTTP interceptor → router/guard → Tailwind/template
2. Read the relevant files to understand the current code flow
3. Check for common issues:
   - **Backend**
     - Controller not wrapped in try/catch, so errors bypass the central handler
     - Validator missing from the route chain, so bad input reaches the service
     - Missing `authenticate` middleware on a protected route
     - Unique constraint enforced only in app code, not at the DB level
     - `passwordHash` or another secret leaking into a response
     - Sequelize connection failing: check `backend/.env` and that `DB_NAME` exists on the MySQL server
     - CORS blocking the browser: `CORS_ORIGIN` must match the frontend dev URL
   - **Frontend**
     - Forgot `standalone: true` or `ChangeDetectionStrategy.OnPush` on a new component
     - Used `[(ngModel)]` instead of reactive forms
     - Used `*ngIf` / `*ngFor` instead of `@if` / `@for`
     - Subscribed to an HTTP observable but never showed loading / error states
     - API base URL hardcoded instead of using `environment.apiUrl`
     - Auth state read from `localStorage` in a component instead of through `AuthService` signals
     - Guard returning `false` instead of a `UrlTree`, leaving the user on a blank page
4. Identify the root cause — not just the symptom
5. Propose a fix that follows the rules in `.claude/rules/`
