# CLAUDE.md — root

Project conventions and context for Claude. When editing files under `frontend/` or `backend/`, also read the matching `CLAUDE.md` in that subdirectory.

## Project overview

Full-stack auth demo split into two independent apps:

```
simple_demo_app/
├── frontend/    # Angular 19 standalone + Tailwind CSS v3
└── backend/     # Node.js + Express + Sequelize + MySQL (plain JS)
```

- **Frontend** is a single-page Angular 19 app using standalone components, signals, reactive forms, functional route guards, and a functional HTTP interceptor. Styling is Tailwind v3 with shared `@layer components` classes defined in `src/styles.css`.
- **Backend** is a plain-JavaScript Express API using Sequelize with the `mysql2` driver, express-validator for request validation, bcryptjs for password hashing, and JWTs for auth.

## Rules, skills, agents

The `.claude/` folder is the source of truth for conventions:

- `.claude/rules/backend-rules.md` — applies when editing `backend/**`
- `.claude/rules/frontend-rules.md` — applies when editing `frontend/**`
- `.claude/rules/styling-rules.md` — applies when editing any `frontend/**/*.css` or template
- `.claude/skills/` — senior-developer mindsets (`backend`, `frontend`, `designer`, `debug`, `review-code`)
- `.claude/agents/` — specialist agents (`backend`, `frontend`, `fullstack`, `git`)
- `.claude/commands/` — slash commands (`new-module`, `new-page`, `git`)

Read the relevant rules file BEFORE writing or editing code in that area.

## API contract (both sides must match)

Success:
```json
{ "success": true, "data": { ... } }
```

Error:
```json
{ "success": false, "message": "Human readable message", "details": [ { "field": "email", "message": "Email already registered" } ] }
```

- `details` is optional; when present it's an array of per-field errors that the frontend maps onto form controls (see `RegisterComponent` for the pattern).
- HTTP status codes are meaningful: 200/201 on success, 400 for validation, 401 for auth, 404 for missing, 409 for unique-constraint conflicts, 500 for everything else.

Shared TypeScript interfaces for request/response bodies live in `frontend/src/app/core/models/` and must stay in sync with the backend shapes.

## Running locally

Two terminals:

```bash
# backend — MySQL must be running and the DB in .env must exist
cd backend && npm install && npm run dev     # http://localhost:3000

# frontend
cd frontend && npm install && npm start      # http://localhost:4200
```

`backend/.env` → `CORS_ORIGIN` must match the frontend dev URL (`http://localhost:4200`).

## Things to avoid

- Rewriting the stack (e.g. converting the frontend to React/Next.js, or the backend to TypeScript) without being explicitly asked
- Introducing a new ORM, state library, form library, or UI kit before exhausting what's already in the project
- Bypassing the central error middleware on the backend or the `AuthService` on the frontend
- Hardcoding colors, base URLs, or secrets
