# CLAUDE.md — backend

Conventions for the `backend/` directory. Read this before writing or editing code here, together with [.claude/rules/backend-rules.md](../.claude/rules/backend-rules.md).

## Stack

- Node.js (CommonJS, plain JavaScript — not TypeScript)
- Express 4
- Sequelize 6 with the `mysql2` driver (MySQL, utf8mb4)
- express-validator for input validation
- bcryptjs for password hashing
- jsonwebtoken for JWT auth
- helmet + cors + express-rate-limit + morgan

## Directory layout

```
backend/
├── server.js                   # entry point — connect DB, sync models, listen
├── src/
│   ├── app.js                  # Express wiring (helmet, cors, rate-limit, routes, error handler)
│   ├── config/
│   │   ├── index.js            # reads .env → typed config object
│   │   └── database.js         # Sequelize instance (MySQL)
│   ├── models/
│   │   ├── index.js            # exports all models + sequelize
│   │   └── user.model.js
│   ├── services/               # business logic — no req/res
│   ├── controllers/            # thin HTTP handlers
│   ├── validators/             # express-validator rule arrays
│   ├── routes/
│   │   ├── index.js            # mounts all subrouters under /api
│   │   └── auth.routes.js
│   ├── middleware/
│   │   ├── auth.middleware.js  # authenticate(req, res, next)
│   │   ├── validate.middleware.js
│   │   └── error.middleware.js # errorHandler + notFoundHandler
│   └── utils/
│       ├── ApiError.js
│       └── jwt.js
└── .env                        # DB credentials + JWT secret + CORS origin
```

## Layer discipline

Routes → Controllers → Services → Models. Never skip a layer.

- **Routes** only wire middleware + controllers. They do not query models.
- **Controllers** are thin: read input, call a service, return `{ success: true, data }`. They never query the DB directly.
- **Services** are plain async functions that take plain arguments and throw `ApiError`. They don't know what `req` or `res` are.
- **Models** own schema + associations + DB-level validation. No business rules.

## Error handling

- Throw `ApiError` (see `src/utils/ApiError.js`) for anything the user should see: `ApiError.badRequest`, `.unauthorized`, `.notFound`, `.conflict`.
- Wrap every controller async body in `try { ... } catch (err) { next(err); }` — never send error responses manually.
- The central `errorHandler` middleware in `src/middleware/error.middleware.js` translates `ApiError`, Sequelize `ValidationError`, and `UniqueConstraintError` into the standard `{ success: false, message, details }` shape.

## Models

- `underscored: true`, `timestamps: true`, plural snake_case `tableName`
- Declare `unique: true` on fields that must be unique AND add a matching entry in `indexes`, so the constraint is enforced at the DB level
- Override `toJSON()` to strip sensitive fields (see `user.model.js` stripping `passwordHash`)
- No raw SQL — use Sequelize methods + `Op` helpers
- For multi-step writes, wrap them in a transaction (`sequelize.transaction(async (t) => { ... })`)

## Validation

- Validator files in `src/validators/` export arrays of express-validator rules (`body(...).isX().withMessage(...)`).
- Routes apply them before the shared `validate` middleware (`src/middleware/validate.middleware.js`), which converts the ValidationResult into `ApiError.badRequest` with `details`.
- Never re-validate in controllers or services.

## Auth

- `authenticate` middleware reads `Authorization: Bearer <token>`, verifies it via `src/utils/jwt.js`, and sets `req.user = { sub, username }`.
- Controllers read the user id as `req.user.sub`.
- Rate limiting is applied on `/api/auth` in `src/app.js`.
- Password operations use `User.setPassword(plain)` (returns a bcrypt hash) and `user.verifyPassword(plain)` (returns boolean). Never call `bcrypt` directly outside the model.

## Config & environment

- Read env values **only** through `require('./src/config')` — never `process.env.*` scattered across files.
- Required env for boot: `DB_NAME`, `DB_USERNAME`. `server.js` checks these and exits with a clear message if missing.

## Adding a new resource

Use the `/new-module` command, or follow [.claude/commands/new-module.md](../.claude/commands/new-module.md). You'll end up with 5 files:

1. `src/models/<name>.model.js`
2. `src/services/<name>.service.js`
3. `src/controllers/<name>.controller.js`
4. `src/validators/<name>.validator.js`
5. `src/routes/<name>.routes.js`

Plus:
- Register the router in `src/routes/index.js`
- Register the model in `src/models/index.js`
