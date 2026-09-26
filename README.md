# Daybook — Daily Expense Tracker

A React + TypeScript frontend and a separate Next.js API backend, with **MySQL authentication** and **MongoDB financial data**. Includes the Version 1 and Version 2 modules in the supplied requirements, plus receipt and profile-image uploads.

## Quick start — Windows, macOS or Linux

Install **Docker Desktop** (with Docker Compose v2) and **Node.js 24**. On Windows, start Docker Desktop with Linux containers before running these commands in PowerShell or a terminal.

Unzip the project, open the `expense-tracker` folder, then run:

```sh
npm run setup
docker compose up --build -d
```

The setup script creates random database passwords and a JWT signing secret. The first Docker build downloads dependencies and database images and can take several minutes. The migration service creates the MySQL tables and MongoDB indexes before the API starts.

Open:

- **Application:** http://localhost:8080
- **Development email inbox:** http://localhost:8025 — password reset links and enabled email notifications appear here. Mailpit captures mail locally; it does not deliver to real inboxes.
- **Health check:** http://localhost:8080/api/health

Create your own account on the registration screen. There are **no shared default credentials or seeded financial records**. Sign in, open **Accounts**, create an account with its opening balance, then add income and expenses. Categories are created automatically on first sign-in.

Check startup:

```sh
docker compose ps
docker compose logs --tail=100 api migrate worker
```

Stop without deleting data:

```sh
docker compose down
```

MySQL and MongoDB data persist in named Docker volumes. Do not use `docker compose down -v` unless you intentionally want to delete all application data.

## What is implemented

| Area | Functionality |
| --- | --- |
| Authentication | Registration, password policy, bcrypt hashes, JWT access cookies, rotating opaque refresh tokens stored as hashes in MySQL, remember me, logout, logout all devices, session revocation, password reset email and change password |
| Profile | Name, email with current-password check, phone, photo, country, timezone, reporting currency, date format, light/dark/system theme, notification preferences |
| Transactions | Income and expense add/view/edit/soft-delete, receipt uploads, merchant/source, tags, notes, account, category, payment method |
| Search and filters | Text/amount/category search; dates and presets, account, category, payment method, merchant, tag, amount range; sorting and server-side pagination |
| Accounts | Opening balances and derived current balances; bank, cash, wallet and other account types; active/inactive state |
| Categories | Default expense/income categories; user-owned custom categories; type and status; protection for categories in use |
| Dashboard | Balance, income, expenses, net savings, today's and current month's spending, budget balance, monthly bar chart, category donut, daily trend and recent activity |
| Budgets | Category or overall budgets, date ranges, spending and remaining balances, configurable 50/75/90/100% alerts, repeated budget periods with separate historical records |
| Recurring transactions | Income/expenses; daily, weekly, monthly, quarterly, yearly or custom intervals; end date; background worker; unique occurrence keys; last-error display |
| Savings goals | Target, current saved amount, target date, status, progress bar and progress notifications |
| Reports | Daily/weekly/monthly/yearly/category/account/payment method/income/expense/income-vs-expense and budget reports |
| Exports | CSV, real XLSX workbooks and downloadable PDFs; exports include all matching transactions, beyond the current page |
| Notifications | Budget thresholds, upcoming and failed recurrence, monthly report availability, savings progress, security activity; read/unread and optional email delivery |
| Administration | User list and activation/deactivation, system counts, login audit, registration configuration and default category management. No access to other users' private financial records. |
| Delivery | Docker Compose, schema initialization, durable database volumes, local email inbox, worker, lockfile, unit tests, a runnable API integration test and a GitHub Actions CI workflow |

## Important behavior

- All financial document reads/writes are scoped to the authenticated MySQL user ID. Admin financial endpoints use that same scope.
- Amounts are persisted and aggregated as integer minor units (e.g. paise). Input supports at most two decimals and a maximum of 10 billion major units per amount.
- Each user chooses **one reporting currency**. Account currency must match it; currency changes are prevented while accounts exist. There is no exchange-rate conversion or mixed-currency aggregation.
- Current account balances are calculated from the opening balance and non-deleted transactions. An edited or deleted transaction is reflected automatically.
- Dashboard cash flow follows the selected date range. Total balance is all-time; today's/current-month values use the profile timezone. Date-only transaction entries are preserved as entered. Server audit timestamps use UTC.
- Savings goals are progress records, not bank transfers. Changing a saved amount does not affect account balances.
- Overlapping budgets can count the same expense. The dashboard's remaining-budget figure is the sum of active budget remainders, not a bank balance.
- The recurring worker checks every minute. It catches up at most 366 occurrences per rule per pass. A rule scheduled on the 31st uses the last day of shorter months and resumes the 31st afterward. The unique occurrence index prevents duplicate entries on retries.
- Delete an automatically generated transaction to remove it permanently from reports; the occurrence remains reserved so a worker retry cannot recreate it.
- Recurring budget periods renew after expiry, keeping previous periods as inactive history. `CUSTOM` does not renew.
- Notification alerts record that a threshold was reached; editing an expense later does not erase historical notifications.
- Receipt/profile files accept PNG, JPEG, WebP and PDF (profile photos require an image), at most 5 MB per upload and 100 MB per user. Files are stored in MongoDB and downloaded through an authenticated API. PDF exports use built-in Latin fonts; non-Latin transaction text requires adding an appropriate Unicode font.
- Interface language is English. The original document's future roadmap — OCR, AI advice, shared accounts, mixed-currency conversion, PWA and offline entry — is not implemented.

## AI spending insights

Set `OPENAI_API_KEY` in the root `.env`, then restart the API container. The dashboard's **AI spending insight** card sends only selected-period aggregate amounts, top five category totals, and active budget totals to OpenAI. It does not send transaction descriptions, merchants, notes, account names, attachments, or credentials. `OPENAI_MODEL` is optional and defaults to `gpt-5-mini`.

## Local development with hot reload

Run MySQL, MongoDB and Mailpit in Docker, with React and Next.js on your computer:

```sh
npm run setup
npm ci
docker compose up -d mysql mongo mailpit
```

In `backend/.env`, change **APP_URL** to `http://localhost:5173`. Keep `MYSQL_DATABASE_URL`, `MONGODB_URI` and SMTP host pointed at localhost as generated. Wait for the database containers to be healthy, then run:

```sh
npm run db:init
npm run dev
```

In a second terminal:

```sh
npm run worker -w backend
```

Open http://localhost:5173. Vite proxies `/api` to Next.js at port 3001, so authentication cookies stay same-origin. When switching back to the full Docker setup, keep the root `.env` APP_URL as `http://localhost:8080`.

## Create an administrator

Register a normal user first, then explicitly promote that account:

```sh
docker compose exec api npm run admin -w backend -- your-email@example.com
```

For local development:

```sh
npm run admin -w backend -- your-email@example.com
```

Sign out and sign back in to see **Administration**. This command does not create a user or change their password. Public registration always creates USER accounts.

## Validation

```sh
npm ci
npm test
npm run typecheck
npm run build
```

With the full Docker stack running at http://localhost:8080:

```sh
npm run test:integration
```

Integration tests create uniquely named test users and records in the development databases. The script prints the email prefix used. Run only against your own development instance. To test a different local origin, set `TEST_URL` in the shell; that origin must also match APP_URL.

**Delivery validation:** the frontend and backend production builds and TypeScript checks passed. Twelve unit tests passed, covering monetary precision, validation, recurrence dates, aggregation and export formula handling. Docker and database servers were unavailable in the build environment, so live MySQL/MongoDB integration, email delivery, worker execution and browser interactions have **not** been verified here. `docs/VALIDATION.md` distinguishes the automated checks from the remaining run checks.

## Configuration

| Variable | Purpose |
| --- | --- |
| APP_URL | Exact browser origin, including port. Required for CSRF origin checks. |
| MYSQL_DATABASE_URL | MySQL authentication connection string for local development. Docker constructs its internal connection using MYSQL_PASSWORD. |
| MYSQL_PASSWORD / MYSQL_ROOT_PASSWORD | Docker MySQL credentials; generated by setup. |
| MONGODB_URI | MongoDB connection string; local defaults in backend/.env, internal hostname supplied by Compose. |
| JWT_ACCESS_SECRET | Random secret, at least 32 characters; generated by setup. |
| COOKIE_SECURE | `false` for localhost HTTP; use `true` when served over HTTPS. |
| SMTP_HOST / SMTP_PORT | SMTP server for local development. |
| DOCKER_SMTP_HOST | Optional real SMTP host override for Compose; defaults to Mailpit. |
| SMTP_USER / SMTP_PASSWORD / SMTP_FROM | SMTP credentials and sender. Blank credentials work with Mailpit. |

Never commit `.env` or `backend/.env`. `npm run setup` preserves existing files, so it does not rotate secrets or database passwords when run again.

## Deployment notes

The provided Compose setup is for a local workstation: all published ports bind to 127.0.0.1, MongoDB is accessible only on the local machine/internal Docker network, and email is captured by Mailpit. For a server deployment, configure HTTPS, `COOKIE_SECURE=true`, the correct APP_URL, authenticated private database access, durable backups, and a real SMTP service. Keep database ports and administration inaccessible to the public. Node-based Next.js with MySQL/MongoDB requires a Node/container host; the built-in Sites Worker host does not provide these raw database connections.

The project includes application validation, same-origin checks, session revocation and per-email login throttling. Before a public deployment, add trusted edge/IP rate limits, resource quotas appropriate to expected usage and your required monitoring. Authentication audit records store user-agent strings; IP addresses are intentionally not inferred from untrusted request headers.

## Project map

```text
expense-tracker/
  frontend/src/           React pages, reusable editors, filters, charts, exports
  backend/src/app/api/   Next.js App Router API dispatcher
  backend/src/lib/       Authentication, finance, validation, jobs, settings, database adapters
  backend/scripts/       Schema initialization, admin promotion, recurring worker
  databases/mysql.sql    Authentication schema
  tests/                 Unit and live API integration tests
  docs/                  API reference, validation record, original requirements
  scripts/setup.mjs      Local secrets and environment setup
  compose.yaml           MySQL, MongoDB, Mailpit, migration, API, worker and web
```

The root package overrides ExcelJS’s transitive `uuid` dependency to 11.1.1; the included Excel round-trip test verifies compatibility.

Database access uses `mysql2` prepared statements and the official MongoDB Node driver. Expenses and income share a `transactions` collection with a `type` discriminator; the public `/api/expenses` and `/api/income` endpoints remain separate. The combined collection makes shared filtering and reports consistent. Refresh tokens are opaque random values; access tokens are signed JWTs.

## Troubleshooting

- **“Request origin is not allowed”:** APP_URL must exactly match the browser origin. Restart API and worker containers after environment changes.
- **MySQL access denied after editing passwords:** Existing MySQL volumes retain their original users/passwords. Restore the original environment values or deliberately rotate database credentials; changing environment variables alone does not update an existing database.
- **Reset email not in your real inbox:** Open Mailpit at localhost:8025. Use a real SMTP configuration for actual delivery.
- **Cannot create an expense:** Create an active account first and select an active category matching the transaction type.
- **Recurring entries not appearing:** Check `docker compose logs worker`, the next execution date, active status and the account/category status. Allow one worker interval.
- **Port already in use:** Change the host port in Compose and APP_URL together. For local development, also update database connection strings if their ports change.
- **Interrupted migration:** Rerun `docker compose run --rm migrate`. Schema and index initialization are idempotent.
#   E x p e n s e _ T r a c k e r  
 