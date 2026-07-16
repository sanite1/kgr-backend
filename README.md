# KGR Backend

Management system backend for KGR Partners Ltd.
Express + TypeScript + Mongoose + Redis, built to the fullstack scaffolding
brief's backend conventions (layered routes → controllers → services → models,
`ApiResponse`/`ApiError` envelopes, express-validation).

## Setup

```sh
npm install
cp .env.example .env    # fill in MONGODB_URI and JWT_SECRET at minimum
npm run seed:admin      # creates the first admin from ADMIN_EMAIL/ADMIN_PASSWORD
npm run dev             # nodemon on port 4000
```

## Scripts

- `npm run dev`: nodemon + ts-node
- `npm run build`: `tsc` → `dist/`
- `npm run start`: `node dist/index.js`
- `npm run check-types`: `tsc --noEmit`
- `npm run seed:admin`: create the first admin account
- `npm run format` / `check-format`: prettier

## Auth model

No public registration: this is a staff management system. The first admin
is seeded; admins create further accounts via `POST /api/users`. Login issues
a short-lived access token (15m) and a refresh token (7d); the frontend's
silent-refresh flow calls `POST /api/auth/refresh` → `{ data: { accessToken } }`.
Roles: `staff | admin` (`interfaces/helper.interface.ts`).

## Endpoints

| Method | Path                        | Auth                         | Purpose                                               |
| ------ | --------------------------- | ---------------------------- | ----------------------------------------------------- |
| GET    | `/api/health`               | :                            | liveness check                                        |
| POST   | `/api/auth/login`           | : (rate-limited 10/15min/IP) | email + password → user + token pair                  |
| POST   | `/api/auth/refresh`         | :                            | refresh token → new access token                      |
| GET    | `/api/auth/me`              | Bearer                       | current user                                          |
| POST   | `/api/auth/change-password` | Bearer                       | change own password                                   |
| GET    | `/api/users`                | admin                        | paginated list (`page,pageSize,role,isActive,search`) |
| POST   | `/api/users`                | admin                        | create staff/admin account (sends welcome email)      |
| GET    | `/api/users/:id`            | admin                        | user detail                                           |
| PATCH  | `/api/users/:id`            | admin                        | update names/role/activation                          |

## Wire envelopes (mirrored by the frontend's `api.types.ts`)

- Success: `{ message, data }` · paginated adds `pagination`
- Error: `{ error, status, message, fields? }`

## Environment

See `.env.example`. Required: `MONGODB_URI`, `JWT_SECRET`. Redis and SMTP are
optional and degrade gracefully (no caching / emails skipped with a warning).
