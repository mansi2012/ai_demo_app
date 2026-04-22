---
description: Scaffold a new backend resource (5 files) for the entity "$ARGUMENTS"
---

Create a new backend resource for the entity "$ARGUMENTS". Use the singular, lowercase form for file names (e.g. `product`, `order`, `post`).

Generate all 5 required files following the patterns already in the codebase (see `user.model.js`, `auth.service.js`, `auth.controller.js`, `auth.validator.js`, `auth.routes.js`):

1. `backend/src/models/$ARGUMENTS.model.js`
   - Sequelize model extending `Model`
   - `underscored: true`, `timestamps: true`, plural snake_case `tableName`
   - Declare `unique: true` on any unique field AND add matching entries in `indexes`
   - Override `toJSON()` if any field should be stripped from responses
   - `require('../config/database')` for the Sequelize instance
2. `backend/src/services/$ARGUMENTS.service.js`
   - Pure business logic — no `req`/`res`
   - Throws `ApiError` (from `../utils/ApiError`) on business errors
   - Accepts plain object arguments
3. `backend/src/controllers/$ARGUMENTS.controller.js`
   - Thin async handlers: parse input → call service → `res.status(...).json({ success: true, data })`
   - Every handler wrapped in `try { ... } catch (err) { next(err); }`
4. `backend/src/validators/$ARGUMENTS.validator.js`
   - Exports express-validator rule arrays (e.g. `createRules`, `updateRules`)
   - Chains like `body('name').trim().notEmpty().withMessage('...')`
5. `backend/src/routes/$ARGUMENTS.routes.js`
   - `express.Router()`
   - Apply rule array → `validate` middleware → controller for each route
   - Protected routes use `authenticate` from `src/middleware/auth.middleware.js`

Also:
- Register the new router in `backend/src/routes/index.js` (e.g. `router.use('/$ARGUMENTS', require('./$ARGUMENTS.routes'))`)
- If the model is new, require it in `backend/src/models/index.js` so `sequelize.sync()` picks it up

Follow all rules in `.claude/rules/backend-rules.md`.
