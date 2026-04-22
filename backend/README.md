# Backend — Node.js + Express + Sequelize (MySQL)

Authentication API with `register`, `login`, and `me` endpoints backed by MySQL.

## Setup

1. Create the database on your MySQL server:
   ```sql
   CREATE DATABASE simple_demo_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. Copy `.env.example` to `.env` and fill in `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`.
3. Install and run:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

Server runs on `http://localhost:3000`. Tables are created automatically via `sequelize.sync()` on startup.

## Endpoints

Base URL: `/api`

| Method | Route             | Auth | Body / Notes                                             |
| ------ | ----------------- | ---- | -------------------------------------------------------- |
| GET    | `/health`         | —    | Health check                                             |
| POST   | `/auth/register`  | —    | `{ firstName, lastName, username, email, password }`     |
| POST   | `/auth/login`     | —    | `{ identifier, password }` — identifier = username or email |
| GET    | `/auth/me`        | Bearer | Returns the current authenticated user                 |

Successful auth responses return `{ success, data: { user, token } }`.

## Structure

```
backend/
├── server.js                 # Entry point (starts HTTP server)
├── src/
│   ├── app.js                # Express app wiring
│   ├── config/               # env + Sequelize instance
│   ├── controllers/          # HTTP layer
│   ├── middleware/           # auth, validate, error handler
│   ├── models/               # Sequelize models
│   ├── routes/               # Express routers
│   ├── services/             # business logic
│   ├── utils/                # helpers (JWT, ApiError)
│   └── validators/           # express-validator rules
└── .env.example
```

## Database

- MySQL via the `mysql2` driver.
- Unique constraints on `username` and `email` are enforced at the DB level (via `unique: true` + explicit `indexes` in the User model).
- Passwords are hashed with bcrypt; never stored or returned in plaintext.
- `utf8mb4` / `utf8mb4_unicode_ci` is set as the default charset/collation.
