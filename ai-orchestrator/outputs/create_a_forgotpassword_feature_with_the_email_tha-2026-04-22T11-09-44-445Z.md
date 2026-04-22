---
Task Understanding:
Implement a forgot password feature for LocalChat where a user submits their registered email, the backend verifies the email exists, generates a random 8-character alphanumeric password, updates the user's password hash in the database, and emails the new plaintext password to the user. The frontend needs a forgot password screen with email input and success/error feedback. QA must validate end-to-end flow including edge cases.

Task Breakdown:
Frontend:
Build a 'Forgot Password' page at /forgot-password with an email input (React Hook Form + Zod validation), submit button, loading state, and success/error toasts. Add a 'Forgot password?' link on the login page. On submit, call POST /api/auth/forgot-password. Always show a generic success message regardless of whether the email exists (to prevent user enumeration).

Backend:
Add POST /api/auth/forgot-password endpoint. Validate email format with Zod. Look up user by email (scoped across users table — note: this is auth, pre-login, so no businessId scoping on the lookup itself, but ensure the user record carries businessId). If user exists, generate an 8-char alphanumeric password (mixed upper/lower/digits), bcrypt-hash it, update users.password_hash, and send email via configured mailer containing the new plaintext password with a security notice to change it after login. Always return 200 with a generic message to prevent enumeration. Rate-limit the endpoint (e.g., 5 requests per hour per IP/email). Log the event for audit.

QA:
Test the complete forgot-password flow via Playwright UI and axios API: valid existing email receives email with new 8-char alphanumeric password and can log in with it; invalid/non-existent email returns same generic success (no enumeration leak); malformed email returns 400; rate-limiting triggers after threshold; old password no longer works after reset; generated password matches regex /^[A-Za-z0-9]{8}$/; email content includes security notice.

Missing Requirements / Assumptions Needed:
  - Email delivery provider not specified (SMTP, SendGrid, AWS SES, Resend?) — confirm which service and credentials are configured.
  - Sending a plaintext password via email is a known security anti-pattern. Recommended alternative: send a time-limited reset-token link (e.g., 30 min) so the user sets their own password. Please confirm product still wants raw password emailed.
  - Should the temporary password force a mandatory password change on next login?
  - Rate-limit thresholds not defined — assuming 5 requests/hour/email+IP.
  - Email template / branding / sender identity (from address, subject line) not provided.
  - Multi-tenant consideration: if the same email can exist under multiple businesses, define which account gets reset (currently assuming email is globally unique per user).

Assigned Agents:
  - Frontend Agent
  - Backend Agent
  - Qa Agent

Frontend Agent:
  Summary: 

Backend Agent:
  Summary: 

QA Agent:
  Skipped — no files landed from implementation phase

---