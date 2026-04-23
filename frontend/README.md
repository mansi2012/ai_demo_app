# Frontend — Next.js + Tailwind CSS

Standalone Next.js app with React Hook Form, Zod validation, and an HTTP client with Bearer auth.

## Setup

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. In development, the app talks to the backend at `http://localhost:3000/api` (see [src/lib/api-client.ts](src/lib/api-client.ts)).

## Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── components/
│   │   └── auth/
│   │       └── SocialLoginButtons.tsx
│   ├── lib/
│   │   ├── api-client.ts        # HTTP client with Bearer interceptor
│   │   └── stores/
│   │       └── auth-store.ts    # Zustand auth state
│   ├── styles/
│   │   └── globals.css          # @tailwind directives + component classes
│   └── middleware.ts
├── tailwind.config.ts
├── postcss.config.js
└── next.config.js
```

## Routing

| Route         | Component              | Notes                                    |
| ------------- | ---------------------- | ---------------------------------------- |
| `/login`      | `LoginPage`            | Email/password form with social buttons  |
| `/register`   | `RegisterPage`         | Sign-up form                             |
| `/dashboard`  | `DashboardPage`        | Protected route (requires auth)          |
| `/`           | Redirects to `/login`  | —                                        |
