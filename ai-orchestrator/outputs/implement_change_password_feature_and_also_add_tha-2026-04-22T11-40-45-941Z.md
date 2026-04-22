---
Task Refinement: refined
Refined version:
Implement a change password feature in the application. Additionally, update the home screen to include a 3-dot menu that allows the user to access the change password option and log out.
(note: Fixed grammar and clarified that the 3-dot menu on the home screen should provide both change password and logout options.)

Task Understanding:
Add a change password feature to LocalChat, accessible via a new 3-dot (kebab) menu on the home screen. The menu should also contain a logout option. This requires a backend endpoint to securely update the user's password, a frontend form to collect current/new passwords, and UI changes on the home screen to surface the menu.

Task Breakdown:
Frontend:
Add a 3-dot menu (kebab icon) on the home screen header with dropdown options: 'Change Password' and 'Logout'. Build a Change Password screen/modal with a React Hook Form + Zod form (currentPassword, newPassword, confirmNewPassword). Wire up to backend via TanStack Query mutation. Handle logout by calling logout endpoint, clearing auth state (Zustand), and redirecting to login.

Backend:
Add POST /api/auth/change-password endpoint. Require JWT auth, extract userId and businessId from token. Validate body with Zod (currentPassword, newPassword min 8 chars with strength rules). Verify currentPassword against stored bcrypt hash, hash newPassword, update users table scoped by userId AND businessId. Optionally invalidate existing refresh tokens. Return 200 on success, 401 on wrong current password, 400 on validation failure.

QA:
Write Playwright UI tests for the 3-dot menu visibility, menu item navigation, change password form validation and success/error flows, and logout flow. Write axios API tests for /api/auth/change-password covering auth, validation, wrong current password, successful change, multi-tenant isolation, and login with new password.

Missing Requirements / Assumptions Needed:
  - (yesno) Should changing the password invalidate all existing refresh tokens/sessions and force re-login on other devices?
  - (choice) Should the Change Password UI be a modal dialog or a dedicated route/page? [Modal dialog on home screen | Dedicated route /settings/change-password | Dedicated route /account/security]
  - (choice) What password strength rules should we enforce on the new password? [Min 8 chars only | Min 8 chars + 1 uppercase + 1 number | Min 10 chars + upper + lower + number + symbol]

User Clarifications:
  Q: Should changing the password invalidate all existing refresh tokens/sessions and force re-login on other devices?
  A: No

  Q: Should the Change Password UI be a modal dialog or a dedicated route/page?
  A: Dedicated route /settings/change-password

  Q: What password strength rules should we enforce on the new password?
  A: Min 8 chars + 1 uppercase + 1 number


Assigned Agents:
  - Frontend Agent
  - Backend Agent
  - Qa Agent

Frontend Agent:
  Summary: Added kebab menu to dashboard header with Change Password and Logout actions, created dedicated /settings/change-password route with RHF+Zod form, and wired up logout flow with query cache clearing.
  Files:
    - [create] frontend/src/components/ui/HeaderMenu.tsx
    - [create] frontend/src/components/layout/DashboardHeader.tsx
    - [create] frontend/src/lib/validations/change-password.ts
    - [create] frontend/src/components/forms/ChangePasswordForm.tsx
    - [create] frontend/src/app/(dashboard)/settings/change-password/page.tsx

Backend Agent:
  Summary: Implemented POST /api/auth/change-password with Zod validation, bcrypt verification, per-user rate limiting, audit logging, and ensured logout endpoint works
  Files:
    - [create] backend/src/modules/auth/auth.schema.ts
    - [create] backend/src/modules/auth/auth.service.ts
    - [create] backend/src/modules/auth/auth.controller.ts
    - [create] backend/src/modules/auth/auth.rateLimit.ts
    - [create] backend/src/modules/auth/auth.router.ts
    - [create] sql/2024_audit_logs.sql

QA Agent:
[
  {
    "test_name": "Dashboard header displays 3-dot kebab menu icon when authenticated",
    "type": "ui",
    "steps": [
      "Login with valid credentials",
      "Navigate to dashboard home",
      "Locate the DashboardHeader component",
      "Assert the 3-dot kebab menu icon is visible"
    ],
    "expected_result": "Kebab menu icon (HeaderMenu trigger) is visible in the dashboard header",
    "ui_url": "/"
  },
  {
    "test_name": "Clicking kebab menu reveals Change Password and Logout options",
    "type": "ui",
    "steps": [
      "Login and navigate to dashboard",
      "Click the 3-dot kebab menu icon in header",
      "Observe the dropdown menu content"
    ],
    "expected_result": "Dropdown displays two items: 'Change Password' and 'Logout'",
    "ui_url": "/"
  },
  {
    "test_name": "Kebab menu closes on outside click",
    "type": "ui",
    "steps": [
      "Login and navigate to dashboard",
      "Click the kebab menu to open it",
      "Click outside the menu (e.g., on page body)"
    ],
    "expected_result": "Menu closes and Change Password/Logout items are no longer visible",
    "ui_url": "/"
  },
  {
    "test_name": "Kebab menu closes on Escape key press",
    "type": "ui",
    "steps": [
      "Login and navigate to dashboard",
      "Click the kebab menu to open it",
      "Press the Escape key"
    ],
    "expected_result": "Menu closes and dropdown items are hidden",
    "ui_url": "/"
  },
  {
    "test_name": "Clicking Change Password navigates to /settings/change-password",
    "type": "ui",
    "steps": [
      "Login and open the kebab menu in dashboard header",
      "Click 'Change Password'"
    ],
    "expected_result": "Browser navigates to /settings/change-password and form is rendered",
    "ui_url": "/"
  },
  {
    "test_name": "Change Password form validation: all fields empty",
    "type": "ui",
    "steps": [
      "Navigate to /settings/change-password",
      "Leave currentPassword, newPassword, confirmPassword empty",
      "Submit the form"
    ],
    "expected_result": "Validation errors are shown for each required field; no API call is made",
    "ui_url": "/settings/change-password"
  },
  {
    "test_name": "Change Password validation: newPassword shorter than 8 characters",
    "type": "ui",
    "steps": [
      "Navigate to /settings/change-password",
      "Enter valid currentPassword",
      "Enter newPassword 'Ab1' (less than 8 chars)",
      "Enter matching confirmPassword 'Ab1'",
      "Submit form"
    ],
    "expected_result": "Inline error indicates new password must be at least 8 characters",
    "ui_url": "/settings/change-password"
  },
  {
    "test_name": "Change Password validation: newPassword missing uppercase letter",
    "type": "ui",
    "steps": [
      "Navigate to /settings/change-password",
      "Enter valid currentPassword",
      "Enter newPassword 'password1' (no uppercase)",
      "Enter matching confirmPassword",
      "Submit form"
    ],
    "expected_result": "Inline error indicates new password must contain at least one uppercase letter",
    "ui_url": "/settings/change-password"
  },
  {
    "test_name": "Change Password validation: newPassword missing number",
    "type": "ui",
    "steps": [
      "Navigate to /settings/change-password",
      "Enter valid currentPassword",
      "Enter newPassword 'Password' (no number)",
      "Enter matching confirmPassword",
      "Submit form"
    ],
    "expected_result": "Inline error indicates new password must contain at least one number",
    "ui_url": "/settings/change-password"
  },
  {
    "test_name": "Change Password validation: confirmPassword does not match newPassword",
    "type": "ui",
    "steps": [
      "Navigate to /settings/change-password",
      "Enter valid currentPassword",
      "Enter newPassword 'NewPass123'",
      "Enter confirmPassword 'NewPass124'",
      "Submit form"
    ],
    "expected_result": "Inline error shown: passwords do not match",
    "ui_url": "/settings/change-password"
  },
  {
    "test_name": "Change Password validation: newPassword equals currentPassword",
    "type": "ui",
    "steps": [
      "Navigate to /settings/change-password",
      "Enter currentPassword 'OldPass123'",
      "Enter newPassword 'OldPass123'",
      "Enter matching confirmPassword",
      "Submit form"
    ],
    "expected_result": "Inline error shown: new password must be different from current password",
    "ui_url": "/settings/change-password"
  },
  {
    "test_name": "Successful password change shows success toast",
    "type": "ui",
    "steps": [
      "Navigate to /settings/change-password",
      "Enter correct currentPassword",
      "Enter valid newPassword 'NewPass123'",
      "Enter matching confirmPassword",
      "Submit form"
    ],
    "expected_result": "Success toast is displayed confirming password change",
    "ui_url": "/settings/change-password"
  },
  {
    "test_name": "Wrong current password shows inline error",
    "type": "ui",
    "steps": [
      "Navigate to /settings/change-password",
      "Enter incorrect currentPassword",
      "Enter valid newPassword 'NewPass123'",
      "Enter matching confirmPassword",
      "Submit form"
    ],
    "expected_result": "Inline error is displayed indicating current password is incorrect; no navigation",
    "ui_url": "/settings/change-password"
  },
  {
    "test_name": "Logout clears session and redirects to /login",
    "type": "ui",
    "steps": [
      "Login and navigate to dashboard",
      "Open kebab menu",
      "Click 'Logout'"
    ],
    "expected_result": "User is redirected to /login; session/query cache cleared",
    "ui_url": "/"
  },
  {
    "test_name": "Protected routes inaccessible after logout",
    "type": "ui",
    "steps": [
      "Login, then logout via kebab menu",
      "After redirect to /login, manually navigate to /settings/change-password"
    ],
    "expected_result": "User is redirected back to /login (cannot access protected route)",
    "ui_url": "/settings/change-password"
  },
  {
    "test_name": "API: change-password without token returns 401",
    "type": "api",
    "steps": [
      "Do not set Authorization header",
      "Send POST /api/v1/auth/change-password with valid body"
    ],
    "expected_result": "Response status 401 with unauthorized error",
    "endpoint": "/api/v1/auth/change-password",
    "method": "POST",
    "body": {
      "currentPassword": "OldPass123",
      "newPassword": "NewPass123",
      "confirmPassword": "NewPass123"
    }
  },
  {
    "test_name": "API: change-password with invalid Zod body returns 400",
    "type": "api",
    "steps": [
      "Login and obtain accessToken",
      "Send POST /api/v1/auth/change-password with missing newPassword field",
      "Include Bearer token"
    ],
    "expected_result": "Response status 400 with Zod validation error details",
    "endpoint": "/api/v1/auth/change-password",
    "method": "POST",
    "body": {
      "currentPassword": "OldPass123"
    }
  },
  {
    "test_name": "API: change-password with weak newPassword (< 8 chars) returns 400",
    "type": "api",
    "steps": [
      "Login and obtain accessToken",
      "Send POST /api/v1/auth/change-password with newPassword 'Ab1'"
    ],
    "expected_result": "Response status 400 with validation error for password length",
    "endpoint": "/api/v1/auth/change-password",
    "method": "POST",
    "body": {
      "currentPassword": "OldPass123",
      "newPassword": "Ab1",
      "confirmPassword": "Ab1"
    }
  },
  {
    "test_name": "API: change-password newPassword missing uppercase returns 400",
    "type": "api",
    "steps": [
      "Login and obtain accessToken",
      "Send POST /api/v1/auth/change-password with newPassword 'password1'"
    ],
    "expected_result": "Response status 400 with validation error requiring uppercase",
    "endpoint": "/api/v1/auth/change-password",
    "method": "POST",
    "body": {
      "currentPassword": "OldPass123",
      "newPassword": "password1",
      "confirmPassword": "password1"
    }
  },
  {
    "test_name": "API: change-password newPassword missing number returns 400",
    "type": "api",
    "steps": [
      "Login and obtain accessToken",
      "Send POST /api/v1/auth/change-password with newPassword 'Password'"
    ],
    "expected_result": "Response status 400 with validation error requiring a number",
    "endpoint": "/api/v1/auth/change-password",
    "method": "POST",
    "body": {
      "currentPassword": "OldPass123",
      "newPassword": "Password",
      "confirmPassword": "Password"
    }
  },
  {
    "test_name": "API: change-password with mismatched confirmPassword returns 400",
    "type": "api",
    "steps": [
      "Login and obtain accessToken",
      "Send POST with newPassword and confirmPassword differing"
    ],
    "expected_result": "Response status 400 indicating confirmPassword does not match",
    "endpoint": "/api/v1/auth/change-password",
    "method": "POST",
    "body": {
      "currentPassword": "OldPass123",
      "newPassword": "NewPass123",
      "confirmPassword": "Different123"
    }
  },
  {
    "test_name": "API: change-password with wrong currentPassword returns 401 INVALID_CURRENT_PASSWORD",
    "type": "api",
    "steps": [
      "Login and obtain accessToken",
      "Send POST /api/v1/auth/change-password with incorrect currentPassword"
    ],
    "expected_result": "Response status 401 with error code INVALID_CURRENT_PASSWORD",
    "endpoint": "/api/v1/auth/change-password",
    "method": "POST",
    "body": {
      "currentPassword": "WrongPass999",
      "newPassword": "NewPass123",
      "confirmPassword": "NewPass123"
    }
  },
  {
    "test_name": "API: change-password with correct current and valid new returns 200",
    "type": "api",
    "steps": [
      "Login with credentials and obtain accessToken",
      "Send POST /api/v1/auth/change-password with valid currentPassword and newPassword 'NewPass123'"
    ],
    "expected_result": "Response status 200 indicating password changed successfully",
    "endpoint": "/api/v1/auth/change-password",
    "method": "POST",
    "body": {
      "currentPassword": "OldPass123",
      "newPassword": "NewPass123",
      "confirmPassword": "NewPass123"
    }
  },
  {
    "test_name": "API: login with new password succeeds after password change",
    "type": "api",
    "steps": [
      "After successful password change to 'NewPass123'",
      "POST /api/v1/auth/login with the new password"
    ],
    "expected_result": "Response status 200 with accessToken returned",
    "endpoint": "/api/v1/auth/login",
    "method": "POST",
    "body": {
      "email": "user@example.com",
      "password": "NewPass123"
    }
  },
  {
    "test_name": "API: login with old password fails after password change",
    "type": "api",
    "steps": [
      "After successful password change",
      "POST /api/v1/auth/login using the old password 'OldPass123'"
    ],
    "expected_result": "Response status 401 invalid credentials",
    "endpoint": "/api/v1/auth/login",
    "method": "POST",
    "body": {
      "email": "user@example.com",
      "password": "OldPass123"
    }
  },
  {
    "test_name": "API multi-tenancy: user from business A cannot change password of user in business B",
    "type": "api",
    "steps": [
      "Login as userA (businessA) and obtain accessToken",
      "Attempt to change password scoped to userB (businessB) via crafted payload/header",
      "Verify server scopes by businessId in token"
    ],
    "expected_result": "Server ignores spoofed target and either operates only on userA's own account or returns 403/404; userB's password remains unchanged and login for userB with original password still works",
    "endpoint": "/api/v1/auth/change-password",
    "method": "POST",
    "body": {
      "currentPassword": "UserAPass1",
      "newPassword": "Hacker123",
      "confirmPassword": "Hacker123"
    }
  },
  {
    "test_name": "API multi-tenancy: userB login with original password still succeeds after cross-tenant attempt",
    "type": "api",
    "steps": [
      "After cross-tenant change-password attempt from userA",
      "POST /api/v1/auth/login as userB with original password"
    ],
    "expected_result": "Response status 200; userB unaffected by cross-tenant request",
    "endpoint": "/api/v1/auth/login",
    "method": "POST",
    "body": {
      "email": "userB@tenantB.com",
      "password": "UserBPass1"
    }
  },
  {
    "test_name": "API: rate limit triggers after N failed change-password attempts",
    "type": "api",
    "steps": [
      "Login as user and obtain accessToken",
      "Repeatedly POST /api/v1/auth/change-password with wrong currentPassword beyond rate-limit threshold"
    ],
    "expected_result": "After threshold, responses return 429 Too Many Requests",
    "endpoint": "/api/v1/auth/change-password",
    "method": "POST",
    "body": {
      "currentPassword": "WrongPass",
      "newPassword": "NewPass123",
      "confirmPassword": "NewPass123"
    }
  },
  {
    "test_name": "API: existing refresh token still works after password change (no forced re-login)",
    "type": "api",
    "steps": [
      "Login and capture refreshToken/cookie",
      "Perform successful change-password",
      "Use original refreshToken to call POST /api/v1/auth/refresh"
    ],
    "expected_result": "Response status 200; refresh token remains valid per product decision (no session invalidation on password change)",
    "endpoint": "/api/v1/auth/refresh",
    "method": "POST",
    "body": {}
  },
  {
    "test_name": "API: logout clears refresh cookie and invalidates refresh token server-side",
    "type": "api",
    "steps": [
      "Login and capture refreshToken cookie",
      "POST /api/v1/auth/logout with accessToken and refresh cookie",
      "Attempt POST /api/v1/auth/refresh using the same refresh token"
    ],
    "expected_result": "Logout returns 200 and clears refresh cookie (Set-Cookie with expiry in past); subsequent refresh attempt returns 401",
    "endpoint": "/api/v1/auth/logout",
    "method": "POST",
    "body": {}
  },
  {
    "test_name": "API: logout without token returns 401",
    "type": "api",
    "steps": [
      "Send POST /api/v1/auth/logout without Authorization header"
    ],
    "expected_result": "Response status 401 unauthorized",
    "endpoint": "/api/v1/auth/logout",
    "method": "POST",
    "body": {}
  },
  {
    "test_name": "API: change-password with whitespace-only fields returns 400",
    "type": "api",
    "steps": [
      "Login and obtain accessToken",
      "Send POST with currentPassword '   ', newPassword '   ', confirmPassword '   '"
    ],
    "expected_result": "Response status 400 Zod validation error",
    "endpoint": "/api/v1/auth/change-password",
    "method": "POST",
    "body": {
      "currentPassword": "   ",
      "newPassword": "   ",
      "confirmPassword": "   "
    }
  },
  {
    "test_name": "API: change-password with newPassword equal to currentPassword returns 400",
    "type": "api",
    "steps": [
      "Login and obtain accessToken",
      "Send POST with newPassword identical to currentPassword"
    ],
    "expected_result": "Response status 400 indicating new password must differ from current",
    "endpoint": "/api/v1/auth/change-password",
    "method": "POST",
    "body": {
      "currentPassword": "OldPass123",
      "newPassword": "OldPass123",
      "confirmPassword": "OldPass123"
    }
  }
]

File Writes:
  - created: frontend/src/components/ui/HeaderMenu.tsx
  - created: frontend/src/components/layout/DashboardHeader.tsx
  - created: frontend/src/lib/validations/change-password.ts
  - created: frontend/src/components/forms/ChangePasswordForm.tsx
  - created: frontend/src/app/(dashboard)/settings/change-password/page.tsx
  - created: backend/src/modules/auth/auth.schema.ts
  - created: backend/src/modules/auth/auth.service.ts
  - created: backend/src/modules/auth/auth.controller.ts
  - created: backend/src/modules/auth/auth.rateLimit.ts
  - created: backend/src/modules/auth/auth.router.ts
  - created: sql/2024_audit_logs.sql
---