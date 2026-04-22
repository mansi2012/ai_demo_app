---
description: Rules that apply when working in the backend/ directory
globs:
  - "backend/**"
---

- Stack: Node.js + Express + Sequelize + MySQL + express-validator + bcryptjs + JWT (plain JavaScript, CommonJS)
- Every new resource needs these files in separate folders:
  1. `src/models/<name>.model.js` — Sequelize model
  2. `src/services/<name>.service.js` — business logic
  3. `src/controllers/<name>.controller.js` — HTTP handlers (thin)
  4. `src/validators/<name>.validator.js` — express-validator rule arrays
  5. `src/routes/<name>.routes.js` — Express router
- Layer discipline: Routes → Controllers → Services → Models (no skipping — routes never touch models, controllers never run queries directly)
- Models: `underscored: true`, `timestamps: true`, plural snake_case `tableName`, utf8mb4 charset/collation
- Unique/lookup columns get explicit `indexes: [{ unique: true, fields: [...] }]` entries so constraints are enforced at the DB level
- No raw SQL — use Sequelize methods; use `Op` for complex WHERE
- Never return `passwordHash` — override `toJSON()` on the model to strip it
- All user-facing errors thrown as `ApiError` (see `src/utils/ApiError.js`); the central `errorHandler` middleware translates them plus Sequelize `ValidationError` and `UniqueConstraintError` into `{ success: false, message, details }`
- All controllers wrap their async body in `try/catch` and pass errors to `next(err)` — never send error responses manually from controllers
- Controllers never call `res.json` with a shape other than `{ success: true, data }` on success
- Validation lives in `validators/` as express-validator rule arrays; routes always pass them through the `validate` middleware before the controller — never re-validate in services
- Services accept plain objects and throw `ApiError` on business errors; they know nothing about `req`/`res`
- Passwords hashed with bcryptjs (10 rounds); never log or return plaintext
- JWT: use `src/utils/jwt.js` (`sign` / `verify`) — don't import `jsonwebtoken` directly elsewhere
- `authenticate` middleware sets `req.user = { sub, username }` from the token; controllers read the user id as `req.user.sub`
- Rate-limit auth routes (already wired in `src/app.js`)
- Environment: read only through `src/config/index.js` — never `process.env.*` scattered around the codebase
- Keep `server.js` minimal: connect DB → `sequelize.sync()` → `app.listen`. All Express wiring lives in `src/app.js`
