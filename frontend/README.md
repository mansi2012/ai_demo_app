# Frontend — Angular + Tailwind CSS

Standalone Angular app with reactive forms, signals, route guards, and an HTTP interceptor for Bearer auth.

## Setup

```bash
cd frontend
npm install
npm start
```

Open `http://localhost:4200`. In development, the app talks to the backend at `http://localhost:3000/api` (see [src/environments/environment.development.ts](src/environments/environment.development.ts)).

## Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── guards/         # authGuard, guestGuard
│   │   │   ├── interceptors/   # Bearer-token interceptor
│   │   │   ├── models/         # shared TS interfaces
│   │   │   └── services/       # AuthService (signals-based)
│   │   ├── pages/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── home/
│   │   ├── shared/             # AuthShellComponent
│   │   ├── app.component.ts
│   │   ├── app.config.ts
│   │   └── app.routes.ts
│   ├── environments/
│   ├── index.html
│   ├── main.ts
│   └── styles.css              # @tailwind directives + component classes
├── angular.json
├── tailwind.config.js
└── postcss.config.js
```

## Routing

| Route       | Guard        | Component        |
| ----------- | ------------ | ---------------- |
| `/login`    | `guestGuard` | `LoginComponent` |
| `/register` | `guestGuard` | `RegisterComponent` |
| `/home`     | `authGuard`  | `HomeComponent`  |
| `/`         | —            | Redirects to `/home` |
| `**`        | —            | Redirects to `/home` |
