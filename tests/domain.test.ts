import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceDate,
  cents,
  fromCents,
  date,
  transaction,
  schemas,
  aggregate,
  escapeRegex,
  password,
} from "../backend/src/lib/domain";
import { safeCell } from "../frontend/src/exports";
const tx = {
  type: "EXPENSE",
  amount: 0.1,
  categoryId: "012345678901234567890123",
  accountId: "012345678901234567890124",
  date: "2026-09-09",
  paymentMethod: "UPI",
  description: "Lunch",
};
test("integer minor units avoid floating point drift", () => {
  assert.equal(fromCents(cents(0.1) + cents(0.2)), 0.3);
  assert.equal(cents(123.45), 12345);
});
test("transaction validation rejects zero, negative, excessive precision and invalid IDs", () => {
  for (const amount of [0, -1, 1.001, Infinity])
    assert.equal(transaction.safeParse({ ...tx, amount }).success, false);
  assert.equal(
    transaction.safeParse({ ...tx, accountId: "injected" }).success,
    false,
  );
  assert.equal(transaction.safeParse(tx).success, true);
});
test("calendar dates reject impossible days", () => {
  assert.equal(date.safeParse("2026-02-29").success, false);
  assert.equal(date.safeParse("2024-02-29").success, true);
  assert.equal(date.safeParse("2026-13-01").success, false);
});
test("monthly recurrence preserves day across February", () => {
  const feb = advanceDate("2026-01-31", "MONTHLY", 1, 31);
  assert.equal(feb, "2026-02-28");
  assert.equal(advanceDate(feb, "MONTHLY", 1, 31), "2026-03-31");
});
test("recurrence supports daily weekly custom quarterly yearly and leap years", () => {
  assert.equal(advanceDate("2026-12-31", "DAILY"), "2027-01-01");
  assert.equal(advanceDate("2026-09-09", "WEEKLY"), "2026-09-16");
  assert.equal(advanceDate("2026-09-09", "CUSTOM", 5), "2026-09-14");
  assert.equal(advanceDate("2026-01-31", "QUARTERLY", 1, 31), "2026-04-30");
  assert.equal(advanceDate("2024-02-29", "YEARLY", 1, 29), "2025-02-28");
});
test("budget date range is ordered and goal amount positive", () => {
  assert.equal(
    schemas.budgets.safeParse({
      name: "Food",
      amount: 100,
      startDate: "2026-09-30",
      endDate: "2026-09-01",
    }).success,
    false,
  );
  assert.equal(
    schemas.savings.safeParse({
      name: "Laptop",
      targetAmount: 0,
      currentAmount: 0,
      targetDate: "2026-10-01",
    }).success,
    false,
  );
});
test("aggregation separates income and expenses using minor units", () => {
  assert.deepEqual(
    aggregate(
      [
        { category: "Food", type: "EXPENSE", amountMinor: 10 },
        { category: "Food", type: "EXPENSE", amountMinor: 20 },
        { category: "Salary", type: "INCOME", amountMinor: 500 },
      ],
      "category",
    ),
    [
      { name: "Food", income: 0, expense: 0.3 },
      { name: "Salary", income: 5, expense: 0 },
    ],
  );
});
test("search treats regex metacharacters literally", () => {
  const input = "a.*(b)[c]$";
  assert.equal(new RegExp(escapeRegex(input)).test(input), true);
  assert.equal(new RegExp(escapeRegex(input)).test("any input"), false);
});
test("password policy requires all character classes", () => {
  assert.equal(password.safeParse("short").success, false);
  assert.equal(password.safeParse("ValidPass123!").success, true);
});
test("spreadsheet cells cannot begin formulas", () => {
  for (const s of ["=1+1", "+SUM(A1)", "@cmd", " -123"])
    assert.ok(safeCell(s).startsWith("'"));
  assert.equal(safeCell("Lunch"), "Lunch");
});
