---
Task Refinement: refined
Refined version:
Implement a forgot-password feature that allows users to request a password reset by submitting their email address, then receive an email containing a reset link they can use to set a new password.
(note: Expanded the short phrase into a concrete minimum flow without adding unmentioned details.)

Task Understanding:
Implement a forgot-password flow for LocalChat where a user submits their email to request a password reset, receives an email with a tokenized reset link, and can use that link to set a new password. Requires a request endpoint, token storage, email delivery, and a reset endpoint, plus corresponding UI screens and end-to-end validation.

Task Breakdown:
Frontend:
Build two screens: (1) /forgot-password — form with email input (Zod validation), calls POST /api/auth/forgot-password, shows generic success toast regardless of whether email exists (to prevent enumeration). (2) /reset-password?token=... — form with new password + confirm password fields, calls POST /api/auth/reset-password, redirects to /login on success. Add a 'Forgot password?' link on the existing login screen. Use React Hook Form + Zod, TanStack Query mutations, Tailwind styling consistent with existing auth screens.

Backend:
Add two endpoints under /api/auth: (1) POST /forgot-password — accepts {email}, always returns 200 with generic message, looks up user, generates a cryptographically secure token (crypto.randomBytes(32).toString('hex')), stores hashed token (sha256) + expiry (1 hour) in a new password_reset_tokens table, enqueues a BullMQ job to send email with link {APP_URL}/reset-password?token={rawToken}. (2) POST /reset-password — accepts {token, newPassword}, hashes token, looks up unused non-expired record, validates password strength (min 8 chars), bcrypt-hashes and updates user password, marks token as used, invalidates all existing refresh tokens for that user. Create migration for password_reset_tokens (id BIGINT PK, userId BIGINT FK, businessId BIGINT, tokenHash VARCHAR(64) UNIQUE, expiresAt DATETIME, usedAt DATETIME NULL, createdAt DATETIME). Add rate limiting on forgot-password (e.g., 5 per hour per IP + per email). Create email worker/template for password reset. Note: these endpoints are public (no JWT), but businessId is still recorded on the token row based on user lookup.

QA:
Validate both UI flows with Playwright and API behavior with axios. Cover: successful request with valid email, request with non-existent email (should still return generic success), invalid email format (client-side validation), rate limit enforcement, valid token reset success, expired token rejection, already-used token rejection, malformed/invalid token rejection, password strength validation, confirm-password mismatch, refresh tokens invalidated after reset (old refresh token no longer works), login works with new password and fails with old password, link in email contains correct token format.

Missing Requirements / Assumptions Needed:
  - (choice) Which email delivery provider should the backend use for sending the reset email? [AWS SES | SendGrid | Resend | SMTP (nodemailer with generic SMTP creds)]
  - (choice) How long should the password reset token remain valid? [15 minutes | 1 hour | 24 hours]
  - (yesno) Should submitting forgot-password for a non-existent email return the same generic success response (to prevent email enumeration)?
  - (yesno) Should all active sessions/refresh tokens be invalidated after a successful password reset?

User Clarifications:
  Q: Which email delivery provider should the backend use for sending the reset email?
  A: SMTP (nodemailer with generic SMTP creds)

  Q: How long should the password reset token remain valid?
  A: 12hours

  Q: Should submitting forgot-password for a non-existent email return the same generic success response (to prevent email enumeration)?
  A: No

  Q: Should all active sessions/refresh tokens be invalidated after a successful password reset?
  A: Yes


Assigned Agents:
  - Frontend Agent
  - Backend Agent
  - Qa Agent

Frontend Agent:
  Summary: Implemented forgot-password and reset-password pages with RHF+Zod, TanStack Query mutations, and added Forgot password link to login page.
  Files:
    - [create] frontend/src/app/(auth)/forgot-password/page.tsx
    - [create] frontend/src/app/(auth)/reset-password/page.tsx
    - [modify] frontend/src/app/(auth)/login/page.tsx

Backend Agent:
  Summary: Implement password reset flow with SMTP email worker, rate limiting, token hashing, and session invalidation
  Files:
    - [create] sql/migrations/20240115_create_password_reset_tokens.sql
    - [create] backend/src/schemas/auth.schema.ts
    - [create] backend/src/middleware/rateLimit.ts
    - [create] backend/src/queues/passwordResetEmail.queue.ts
    - [create] backend/src/services/auth/passwordReset.service.ts
    - [create] backend/src/controllers/auth/passwordReset.controller.ts
    - [modify] backend/src/routes/auth.ts
    - [create] backend/src/config/mailer.ts
    - [create] backend/src/workers/passwordResetEmail.worker.ts
    - [create] backend/src/config/env.example.ts

QA Agent:
[
  {
    "test_name": "UI: Forgot password link navigates from login",
    "type": "ui",
    "steps": [
      "Navigate to /login",
      "Click the 'Forgot password?' link"
    ],
    "expected_result": "User is redirected to /forgot-password page",
    "ui_url": "/login"
  },
  {
    "test_name": "UI: Submit valid registered email shows neutral success toast",
    "type": "ui",
    "steps": [
      "Navigate to /forgot-password",
      "Enter a valid registered email (e.g. user@tenant1.com)",
      "Click the submit button"
    ],
    "expected_result": "A neutral success toast is shown (generic message like 'If an account exists, a reset link was sent')",
    "ui_url": "/forgot-password"
  },
  {
    "test_name": "UI: Submit unregistered email shows same neutral success toast (no enumeration)",
    "type": "ui",
    "steps": [
      "Navigate to /forgot-password",
      "Enter a valid-format but unregistered email (e.g. ghost@nowhere.com)",
      "Click the submit button"
    ],
    "expected_result": "The same neutral success toast is shown as for registered emails; no indication email is unknown",
    "ui_url": "/forgot-password"
  },
  {
    "test_name": "UI: Invalid email format triggers Zod client-side error with no network call",
    "type": "ui",
    "steps": [
      "Navigate to /forgot-password",
      "Intercept /api/v1/auth/forgot-password network calls",
      "Enter an invalid email string (e.g. 'notanemail')",
      "Click submit"
    ],
    "expected_result": "Inline Zod validation error is shown and no POST request is sent to /api/v1/auth/forgot-password",
    "ui_url": "/forgot-password"
  },
  {
    "test_name": "UI: /reset-password without token shows error state with link back",
    "type": "ui",
    "steps": [
      "Navigate directly to /reset-password (no token query param)"
    ],
    "expected_result": "Error state is displayed with a link back to /forgot-password or /login",
    "ui_url": "/reset-password"
  },
  {
    "test_name": "UI: /reset-password with invalid token shows inline error on submit",
    "type": "ui",
    "steps": [
      "Navigate to /reset-password?token=INVALID_TOKEN_123",
      "Enter a valid new password (>=8 chars) and matching confirm password",
      "Click submit"
    ],
    "expected_result": "An inline error message is displayed (e.g. 'Invalid or expired token'); user is not redirected to login",
    "ui_url": "/reset-password?token=INVALID_TOKEN_123"
  },
  {
    "test_name": "UI: Happy path end-to-end password reset",
    "type": "ui",
    "steps": [
      "Login via API to seed a known user with password 'OldPass123!'",
      "Navigate to /forgot-password",
      "Submit the registered email",
      "Retrieve the reset token from the password_reset_tokens DB row (raw token from test mail hook)",
      "Navigate to /reset-password?token=<RAW_TOKEN>",
      "Enter new password 'NewPass456!' and matching confirm password",
      "Submit the form",
      "Expect redirect to /login",
      "Attempt login with old password 'OldPass123!'",
      "Attempt login with new password 'NewPass456!'"
    ],
    "expected_result": "Form submits successfully, redirects to /login; login with old password fails (401); login with new password succeeds (200 with accessToken)",
    "ui_url": "/forgot-password"
  },
  {
    "test_name": "UI: Password less than 8 chars shows validation error",
    "type": "ui",
    "steps": [
      "Navigate to /reset-password?token=SOMETOKEN",
      "Enter new password 'short' (<8 chars)",
      "Enter matching confirm password",
      "Submit"
    ],
    "expected_result": "Inline Zod validation error is shown for password length; no network call made",
    "ui_url": "/reset-password?token=SOMETOKEN"
  },
  {
    "test_name": "UI: Confirm password mismatch shows validation error",
    "type": "ui",
    "steps": [
      "Navigate to /reset-password?token=SOMETOKEN",
      "Enter new password 'NewPass456!'",
      "Enter confirm password 'Different789!'",
      "Submit"
    ],
    "expected_result": "Inline Zod validation error shown for password mismatch; no network call made",
    "ui_url": "/reset-password?token=SOMETOKEN"
  },
  {
    "test_name": "API: Forgot-password with valid registered email returns 200 generic",
    "type": "api",
    "steps": [
      "Send POST /api/v1/auth/forgot-password with JSON body containing a registered email"
    ],
    "expected_result": "Response status 200 with a generic success message; no indication whether email exists",
    "endpoint": "/api/v1/auth/forgot-password",
    "method": "POST",
    "body": {
      "email": "user@tenant1.com"
    }
  },
  {
    "test_name": "API: Forgot-password with valid-format but unregistered email returns 200 generic",
    "type": "api",
    "steps": [
      "Send POST /api/v1/auth/forgot-password with valid-format email that does not exist in users table"
    ],
    "expected_result": "Response status 200 with same generic success message as registered email case",
    "endpoint": "/api/v1/auth/forgot-password",
    "method": "POST",
    "body": {
      "email": "ghost@nowhere.com"
    }
  },
  {
    "test_name": "API: Forgot-password with invalid email format returns 400",
    "type": "api",
    "steps": [
      "Send POST /api/v1/auth/forgot-password with malformed email string"
    ],
    "expected_result": "Response status 400 with Zod validation error",
    "endpoint": "/api/v1/auth/forgot-password",
    "method": "POST",
    "body": {
      "email": "notanemail"
    }
  },
  {
    "test_name": "API: Forgot-password with missing email field returns 400",
    "type": "api",
    "steps": [
      "Send POST /api/v1/auth/forgot-password with empty body"
    ],
    "expected_result": "Response status 400 with validation error about missing email",
    "endpoint": "/api/v1/auth/forgot-password",
    "method": "POST",
    "body": {}
  },
  {
    "test_name": "API: Rate limit returns 429 on 6th request within an hour",
    "type": "api",
    "steps": [
      "Send 5 successive POST /api/v1/auth/forgot-password requests from same IP within an hour",
      "Send a 6th POST /api/v1/auth/forgot-password request from same IP"
    ],
    "expected_result": "First 5 requests return 200; 6th request returns 429 Too Many Requests",
    "endpoint": "/api/v1/auth/forgot-password",
    "method": "POST",
    "body": {
      "email": "user@tenant1.com"
    }
  },
  {
    "test_name": "API: Reset-password with expired token returns 400",
    "type": "api",
    "steps": [
      "Create a password_reset_tokens row for a user",
      "Manually UPDATE the row to set expiresAt to a past timestamp (older than 12h)",
      "Send POST /api/v1/auth/reset-password with the raw token and new password"
    ],
    "expected_result": "Response status 400 with error indicating token expired/invalid",
    "endpoint": "/api/v1/auth/reset-password",
    "method": "POST",
    "body": {
      "token": "<EXPIRED_RAW_TOKEN>",
      "password": "NewPass456!",
      "confirmPassword": "NewPass456!"
    }
  },
  {
    "test_name": "API: Reset-password with already-used token returns 400",
    "type": "api",
    "steps": [
      "Request a password reset to create a token",
      "Send POST /api/v1/auth/reset-password with the raw token (first use succeeds with 200)",
      "Send POST /api/v1/auth/reset-password again with the same token"
    ],
    "expected_result": "Second request returns 400 indicating token already used/invalid",
    "endpoint": "/api/v1/auth/reset-password",
    "method": "POST",
    "body": {
      "token": "<USED_RAW_TOKEN>",
      "password": "AnotherPass789!",
      "confirmPassword": "AnotherPass789!"
    }
  },
  {
    "test_name": "API: Reset-password with malformed token returns 400",
    "type": "api",
    "steps": [
      "Send POST /api/v1/auth/reset-password with a random garbage token string"
    ],
    "expected_result": "Response status 400 with invalid token error",
    "endpoint": "/api/v1/auth/reset-password",
    "method": "POST",
    "body": {
      "token": "!!!notatoken!!!",
      "password": "NewPass456!",
      "confirmPassword": "NewPass456!"
    }
  },
  {
    "test_name": "API: Reset-password with password < 8 chars returns 400",
    "type": "api",
    "steps": [
      "Generate a valid reset token",
      "Send POST /api/v1/auth/reset-password with password 'short'"
    ],
    "expected_result": "Response status 400 with Zod validation error on password length",
    "endpoint": "/api/v1/auth/reset-password",
    "method": "POST",
    "body": {
      "token": "<VALID_RAW_TOKEN>",
      "password": "short",
      "confirmPassword": "short"
    }
  },
  {
    "test_name": "API: Reset-password with mismatched confirmPassword returns 400",
    "type": "api",
    "steps": [
      "Generate a valid reset token",
      "Send POST /api/v1/auth/reset-password with mismatched password and confirmPassword"
    ],
    "expected_result": "Response status 400 with validation error about password mismatch",
    "endpoint": "/api/v1/auth/reset-password",
    "method": "POST",
    "body": {
      "token": "<VALID_RAW_TOKEN>",
      "password": "NewPass456!",
      "confirmPassword": "Different789!"
    }
  },
  {
    "test_name": "API: Successful reset invalidates previously issued refresh tokens",
    "type": "api",
    "steps": [
      "Login as user to obtain refresh cookie",
      "Request a password reset for that user",
      "Retrieve raw reset token",
      "POST /api/v1/auth/reset-password with token and new password",
      "Send POST /api/v1/auth/refresh with the old refresh cookie"
    ],
    "expected_result": "Reset returns 200; subsequent /auth/refresh with old cookie returns 401",
    "endpoint": "/api/v1/auth/refresh",
    "method": "POST",
    "body": {}
  },
  {
    "test_name": "API: Multi-tenancy - reset only affects target user's row",
    "type": "api",
    "steps": [
      "Seed two users in different businesses: userA in businessA (password 'OldA123!') and userB in businessB (password 'OldB123!')",
      "Request password reset for userA",
      "Retrieve raw token for userA and submit /api/v1/auth/reset-password with new password 'NewA456!'",
      "Attempt login as userA with 'NewA456!'",
      "Attempt login as userA with 'OldA123!'",
      "Attempt login as userB with 'OldB123!'",
      "Attempt login as userB with 'NewA456!'"
    ],
    "expected_result": "userA login succeeds with new password and fails with old; userB login succeeds with original password and fails with userA's new password; businessId isolation maintained",
    "endpoint": "/api/v1/auth/login",
    "method": "POST",
    "body": {
      "email": "userB@tenant2.com",
      "password": "OldB123!"
    }
  },
  {
    "test_name": "API: Token stored hashed in DB, not raw",
    "type": "api",
    "steps": [
      "Send POST /api/v1/auth/forgot-password for a registered user",
      "Retrieve the raw token from mail hook",
      "Query the password_reset_tokens table for the newest row of that user",
      "Compare tokenHash column to the raw token"
    ],
    "expected_result": "tokenHash column is not equal to the raw token; it is a hashed value (e.g. bcrypt/sha256 hash)",
    "endpoint": "/api/v1/auth/forgot-password",
    "method": "POST",
    "body": {
      "email": "user@tenant1.com"
    }
  },
  {
    "test_name": "API: Reset-password with missing token field returns 400",
    "type": "api",
    "steps": [
      "Send POST /api/v1/auth/reset-password with password fields but no token"
    ],
    "expected_result": "Response status 400 with validation error about missing token",
    "endpoint": "/api/v1/auth/reset-password",
    "method": "POST",
    "body": {
      "password": "NewPass456!",
      "confirmPassword": "NewPass456!"
    }
  },
  {
    "test_name": "API: Token valid for ~12 hours boundary",
    "type": "api",
    "steps": [
      "Create a reset token and set its expiresAt to now + 11h59m in DB",
      "POST /api/v1/auth/reset-password with the raw token and a valid new password",
      "Create another reset token and set its expiresAt to now - 1 minute",
      "POST /api/v1/auth/reset-password with that raw token and a valid new password"
    ],
    "expected_result": "First reset returns 200 (within 12h window); second reset returns 400 (just expired)",
    "endpoint": "/api/v1/auth/reset-password",
    "method": "POST",
    "body": {
      "token": "<TOKEN>",
      "password": "NewPass456!",
      "confirmPassword": "NewPass456!"
    }
  }
]

File Writes:
  - created: frontend/src/app/(auth)/forgot-password/page.tsx
  - created: frontend/src/app/(auth)/reset-password/page.tsx
  - created: frontend/src/app/(auth)/login/page.tsx
  - created: sql/migrations/20240115_create_password_reset_tokens.sql
  - created: backend/src/schemas/auth.schema.ts
  - created: backend/src/middleware/rateLimit.ts
  - created: backend/src/queues/passwordResetEmail.queue.ts
  - created: backend/src/services/auth/passwordReset.service.ts
  - created: backend/src/controllers/auth/passwordReset.controller.ts
  - created: backend/src/routes/auth.ts
  - created: backend/src/config/mailer.ts
  - created: backend/src/workers/passwordResetEmail.worker.ts
  - created: backend/src/config/env.example.ts
---