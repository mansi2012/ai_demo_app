---
Task Understanding:
The task requires creating a database seeder to insert a single admin/user record (name: 'Mansi Mistry', username: 'mansi_mistry', email: 'mansimistry.di@gmail.com', password: 'mansi123##') only if it does not already exist. This is a backend-only operation with no UI or frontend components involved.

Task Breakdown:
Frontend:
Not required

Backend:
Create a MySQL seeder script that checks for existence of the user with email 'mansimistry.di@gmail.com' before inserting a new record into the 'users' table. The seeder must hash the password (using the app's existing bcrypt logic), set createdAt/updatedAt timestamps, and preserve multi-tenancy by assigning a default businessId (or clarify requirement — businessId may be required but ambiguous here).

QA:
QA must verify the seeder: (1) does not insert duplicate record on re-run (idempotency), (2) successfully inserts record on first run, (3) validates password hash matches bcrypt, (4) ensures required fields (email, name, etc.) are non-null and conform to DB constraints, (5) logs no errors on missing optional fields (e.g. phone, role).

Missing Requirements / Assumptions Needed:
  - Clarify whether a default businessId should be assigned — e.g., fallback to a system tenant or require manual input. Also clarify if this user is a system admin (global access) or tied to a specific business (e.g., businessId = 1)

Assigned Agents:
  - Backend Agent
  - Qa Agent

Backend Agent:
  Summary: Created AdminUserSeeder to seed Mansi Mistry as admin user if not present, using transaction and bcrypt hashing
  Files:
    - [create] backend/src/db/seeds/AdminUserSeeder.ts

QA Agent:
[
  {
    "test_name": "Seeder runs twice and creates only one admin user record",
    "type": "api",
    "steps": [
      "Run AdminUserSeeder twice in succession via CLI or test harness",
      "Query admin_users table after each run"
    ],
    "expected_result": "Exactly one record with email = 'mansimistry.di@gmail.com' exists after both runs",
    "endpoint": "/api/v1/auth/login",
    "method": "POST",
    "body": {
      "username": "mansimistry.di@gmail.com",
      "password": "password123"
    },
    "ui_url": ""
  },
  {
    "test_name": "User record has correct bcrypt hash prefix and non-null required fields",
    "type": "api",
    "steps": [
      "Connect to MySQL directly",
      "SELECT * FROM admin_users WHERE email = 'mansimistry.di@gmail.com'",
      "Verify password_hash starts with '$2b$'",
      "Verify non-null values for all required columns: email, password_hash, role, created_at, updated_at"
    ],
    "expected_result": "Record exists with password_hash starting with '$2b$', and all required fields non-null",
    "endpoint": "",
    "method": "GET",
    "body": {},
    "ui_url": ""
  },
  {
    "test_name": "Login as seeded admin user succeeds with correct credentials",
    "type": "api",
    "steps": [
      "POST /api/v1/auth/login with username='mansimistry.di@gmail.com' and password='password123'",
      "Verify response contains data.accessToken"
    ],
    "expected_result": "HTTP 200 with response structure { data: { accessToken: string } }",
    "endpoint": "/api/v1/auth/login",
    "method": "POST",
    "body": {
      "username": "mansimistry.di@gmail.com",
      "password": "password123"
    },
    "ui_url": ""
  },
  {
    "test_name": "Re-running seeder after user exists does not throw DB errors or duplicates",
    "type": "api",
    "steps": [
      "Ensure user with email='mansimistry.di@gmail.com' already exists",
      "Run AdminUserSeeder again",
      "Capture any exceptions or DB errors during execution",
      "Verify row count in admin_users table is still 1"
    ],
    "expected_result": "No DB errors, no duplicate insertions, user record unchanged",
    "endpoint": "",
    "method": "POST",
    "body": {},
    "ui_url": ""
  },
  {
    "test_name": "Seeder execution completes without console errors or unhandled rejections",
    "type": "ui",
    "steps": [
      "Execute AdminUserSeeder via CLI in local environment",
      "Monitor stdout/stderr for logs",
      "Check for unhandled promise rejections or exceptions"
    ],
    "expected_result": "Clean exit with no errors in console logs",
    "endpoint": "",
    "method": "GET",
    "body": {},
    "ui_url": "http://localhost:3000/seed-status"
  },
  {
    "test_name": "Negative login case: invalid password rejected with 401",
    "type": "api",
    "steps": [
      "POST /api/v1/auth/login with correct email but incorrect password",
      "Verify response code and message"
    ],
    "expected_result": "HTTP 401 Unauthorized with appropriate error message",
    "endpoint": "/api/v1/auth/login",
    "method": "POST",
    "body": {
      "username": "mansimistry.di@gmail.com",
      "password": "wrongpassword"
    },
    "ui_url": ""
  },
  {
    "test_name": "Multi-tenancy isolation: other tenants' users unaffected by this seeder",
    "type": "api",
    "steps": [
      "Before seeding, ensure no records exist for other businessIds",
      "Run seeder under businessId X",
      "Query admin_users table for records with different businessIds",
      "Confirm no data leakage between businessIds"
    ],
    "expected_result": "Only the seeded user exists under its businessId; others remain untouched",
    "endpoint": "/api/v1/admin/users",
    "method": "GET",
    "body": {},
    "ui_url": ""
  },
  {
    "test_name": "Money formatting test: salary field (if exists) correctly converts paise to rupee representation",
    "type": "api",
    "steps": [
      "If admin_users table has salary column stored in paise, insert test value 50000 paise",
      "Verify API returns 500.00 (formatted as rupees)",
      "Check DB stored value = 50000"
    ],
    "expected_result": "API response shows rupee amount (e.g., 500.00), DB stores integer paise (e.g., 50000)",
    "endpoint": "/api/v1/admin/users",
    "method": "GET",
    "body": {},
    "ui_url": ""
  },
  {
    "test_name": "UI check: admin user listing page does not display seeded user if API returns 0 records (edge)",
    "type": "ui",
    "steps": [
      "Clear all admin_users via DB",
      "Navigate to /users page on port 3000",
      "Confirm empty state message appears"
    ],
    "expected_result": "UI displays appropriate empty state message when no users exist",
    "endpoint": "",
    "method": "GET",
    "body": {},
    "ui_url": "http://localhost:3000/users"
  },
  {
    "test_name": "Seeder error handling: missing required field throws during seeding",
    "type": "api",
    "steps": [
      "Temporarily modify seeder to omit password_hash",
      "Attempt run",
      "Verify error is thrown and no partial insert occurs"
    ],
    "expected_result": "Seeder fails with validation error, transaction rolls back, no new row inserted",
    "endpoint": "",
    "method": "POST",
    "body": {},
    "ui_url": ""
  }
]

File Writes:
  - created: backend/src/db/seeds/AdminUserSeeder.ts
---