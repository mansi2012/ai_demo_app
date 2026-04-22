---
Task Understanding:
Implement a forgot-password feature for LocalChat where a user submits their registered email, and if the email exists, the backend generates a random 8-character alphanumeric password, updates the user's password hash in the database, and emails the new plaintext password to them. Frontend provides a 'Forgot Password' screen linked from the login page.

Task Breakdown:
Frontend:
Add a 'Forgot Password?' link on the login page that navigates to a new /forgot-password route. Build the page with a single email input (React Hook Form + Zod validation), a submit button, loading/disabled state, and success/error toasts. On submit, call POST /api/auth/forgot-password. Always show a generic success message regardless of whether the email exists (to prevent enumeration).

Backend:
Add POST /api/auth/forgot-password endpoint (public, no auth). Accept { email } validated by Zod. Look up user by email across tenants (this endpoint is tenant-agnostic since user is not logged in). If user exists: generate an 8-char alphanumeric password (mix of letters+digits, cryptographically random via crypto.randomBytes), bcrypt-hash it, update users.password_hash, and enqueue an email job via BullMQ to send the new password to the user's email using the configured mail transport. If user does not exist, silently succeed. Always respond 200 with a generic message. Add rate limiting (e.g. 5 requests per 15 min per IP+email) to prevent abuse. Log the event in an audit table if one exists.

QA:
Validate full flow with Playwright UI tests and axios API tests covering success, non-existent email, invalid email format, rate limiting, password reset actually working for login, and that the old password no longer works.

Missing Requirements / Assumptions Needed:
  - (choice) Which email delivery provider should be used for sending the new password? [Nodemailer with SMTP (existing config) | AWS SES | SendGrid | Resend]
  - (yesno) Should the generated password force the user to change it on next login?
  - (yesno) Should we use the secure industry-standard approach instead (email a time-limited reset link rather than emailing a plaintext password)?
  - (choice) Should the forgot-password flow require the user to also provide their businessId/tenant, or look up purely by unique email? [Email only (assume email is globally unique) | Email + business identifier | Email, and if multiple matches send to all]

User Clarifications:
  Q: Which email delivery provider should be used for sending the new password?
  A: Nodemailer with SMTP (existing config)

  Q: Should the generated password force the user to change it on next login?
  A: No

  Q: Should we use the secure industry-standard approach instead (email a time-limited reset link rather than emailing a plaintext password)?
  A: Yes

  Q: Should the forgot-password flow require the user to also provide their businessId/tenant, or look up purely by unique email?
  A: Email only (assume email is globally unique)


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