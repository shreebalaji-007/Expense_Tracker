# Validation record

## Executed in the authoring environment

- Dependency installation completed and package-lock.json generated.
- Final `npm audit` reported 0 known vulnerabilities in the resolved dependency tree (point-in-time dependency check, not a security certification).
- Compose YAML parsed and required service wiring checked (not a Docker execution).
- Environment setup checked for matching random database credentials and idempotent reruns.
- React/TypeScript frontend production build passed.
- Next.js backend production build passed.
- Frontend and backend strict TypeScript checks passed.
- 12 unit tests passed: minor-unit arithmetic, transaction validation, valid dates, month-end and leap-year recurring schedules, budgets, savings validation, aggregation, escaped search text, password policy, export formula protection, real Excel workbook round-trip and PDF table generation.

## Not executed here

Docker and local database services were unavailable. Consequently, no claim is made that live MySQL/MongoDB integration or the Compose deployment was exercised in this environment. Browser interaction tests were not performed.

## Included integration test

After `docker compose up --build -d` and successful health checks, run `npm ci` and `npm run test:integration` from the project root. The script checks:

1. Register/login and bootstrap two independent users.
2. Create accounts, expenses and income; verify derived balance.
3. Reject cross-user record access/mutation and wrong-origin writes.
4. Reject invalid amounts and deletion of referenced accounts.
5. Generate budget alerts; recalculate usage after expense edit/delete.
6. Search, filter, paginate and report matching transactions.
7. Update savings goals and generate progress notifications.
8. Reject non-admin access to administration.
9. Rotate refresh tokens, reject replay and revoke all sessions.

## Remaining manual acceptance checks

1. Register in the browser; create an account, income and expense; reload and confirm persistence.
2. Upload a receipt, open it, verify another account cannot retrieve it.
3. Filter transactions and download CSV, Excel and PDF; inspect amounts and rows.
4. Set a recurring transaction due today; allow a minute; verify exactly one entry. Restart worker and verify no duplicate.
5. Confirm a 31st-day recurring rule preserves its anchor through short months.
6. Request password reset; open Mailpit; reset the password; confirm old sessions fail.
7. Update profile, password, theme and timezone; reload and verify settings.
8. Promote a test admin; deactivate another user; confirm their session is rejected.
9. Check mobile navigation, keyboard focus, dialog cancellation and forms at narrow widths.
10. Restart the Compose stack and verify both databases retain the records.

See README.md for scope limits and the original requirements in REQUIREMENTS.md for future roadmap items.
