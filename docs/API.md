# API reference

Base path: `/api`. All requests use same-origin cookies. Every non-GET request must include an `Origin` header equal to APP_URL. JSON bodies use `Content-Type: application/json`; uploads use multipart form data. Success responses use `{success:true,message,data}`; failures use `{success:false,message,errorCode}`.

## Authentication

| Method | Path | Body / result |
| --- | --- | --- |
| POST | /auth/register | firstName, lastName, email, password, confirmPassword |
| POST | /auth/login | email, password, remember (boolean) |
| POST | /auth/refresh | `{}`; rotates session cookies |
| GET | /auth/me | Current user |
| POST | /auth/logout | `{}`; revoke current session |
| POST | /auth/logout-all | `{}`; revoke all sessions |
| POST | /auth/forgot-password | email |
| POST | /auth/reset-password | token, password, confirmPassword |
| POST | /auth/change-password | currentPassword, password, confirmPassword |
| POST | /bootstrap | `{}`; initialize categories and return preferences |

## Transactions

GET/POST `/expenses`, `/income`, `/transactions`; GET/PUT/DELETE `/{resource}/{id}`. DELETE soft-deletes. `/expenses` forces EXPENSE; `/income` forces INCOME.

```json
{
  "type": "EXPENSE",
  "amount": 350,
  "categoryId": "a valid owned MongoDB ObjectId",
  "accountId": "a valid owned MongoDB ObjectId",
  "date": "2026-09-09",
  "paymentMethod": "UPI",
  "description": "Lunch",
  "merchant": "Restaurant",
  "source": "",
  "tags": ["office"],
  "notes": "",
  "attachmentId": null
}
```

Filters: `from`, `to` (YYYY-MM-DD), `type`, `categoryId`, `accountId`, `paymentMethod`, `merchant`, `tags`, `minAmount`, `maxAmount`, `search`. Pagination: `page`, `pageSize` (maximum 100). Sort: `sort=date|amountMinor|description|category|createdAt|updatedAt`, `order=asc|desc`.

List result: `data.items` and `data.pagination` with page, pageSize, totalRecords, totalPages. `/expenses/search` is a list alias; `/expenses/summary` and `/expenses/category-summary` aggregate matching transactions. Equivalent income endpoints are available. Dates use the canonical `date` field rather than expenseDate/incomeDate.

## Resource CRUD

GET/POST `/{resource}` and GET/PUT/DELETE `/{resource}/{id}`. PUT accepts the full editable object. Request amounts are major units; stored amounts are integer minor units.

| Resource | Main fields |
| --- | --- |
| categories | name, type (EXPENSE/INCOME), icon, description, active |
| accounts | name, type, openingBalance, currency, description, active |
| budgets | name, categoryId (nullable for all categories), amount, startDate, endDate, period (WEEKLY/MONTHLY/YEARLY/CUSTOM), alerts (array of percentages), active |
| recurring | Transaction fields except date/attachmentId, plus name, frequency, intervalDays, nextDate, endDate (nullable), active |
| savings | name, targetAmount, currentAmount, targetDate, description, status (ACTIVE/COMPLETED/PAUSED) |

Accounts return derived `balance`. Budgets return `spent`, `remaining` and `percent`. Category/account deletion is rejected when referenced by live transactions, recurring rules or budgets; use `active:false` instead.

## Dashboard and reports

GET `/dashboard/summary` returns dashboard cards, charts, budgets and recent activity. Chart-only aliases: `/dashboard/income-expense`, `/dashboard/category-expenses`, `/dashboard/spending-trend`, `/dashboard/budget-summary`.

GET `/reports/{daily|weekly|monthly|yearly|category|accounts|payment-method|income|expense|income-expense}` uses transaction filters. Returns `items` (all matching transactions, with category/account names), `groups`, `income`, `expense`. GET `/reports/budget` returns budget usage records. Client renders budget date/category filters over those records. CSV/XLSX/PDF generation runs in the React frontend from the authorized full report response; there are no file export endpoints.

## Profile, notifications, files and admin

- GET/PUT `/settings` — profile and preferences. Email changes require currentPassword. Currency changes are blocked while accounts exist.
- GET `/settings/login-history` — most recent 100 authentication events for current user.
- POST `/attachments` — multipart field `file`, maximum 5 MB; validates file signatures.
- GET `/attachments/{id}` — owner-authenticated binary response.
- GET `/notifications` — most recent 100 notifications.
- PUT `/notifications/{id}` or `/notifications/read-all` — mark read, body `{}`.
- GET `/admin/users`, `/admin/stats`, `/admin/audit`, `/admin/config` — admin only.
- PUT `/admin/users/{uuid}` — `{status:"ACTIVE"|"INACTIVE"}`; revokes sessions.
- PUT `/admin/config` — registrationEnabled and categories array of `{name,type}` for new users.
- GET `/health` — verifies connectivity to both databases; returns no credentials.

## Background processing

`npm run worker -w backend` executes recurring transactions and notifications once per minute. The worker is separate from Next.js request handling. No public cron endpoint or secret-bearing URL is required. Database indexes are required before worker startup.
