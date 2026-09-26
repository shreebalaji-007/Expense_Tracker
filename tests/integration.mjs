// Run against the Docker stack. Creates disposable test users and their data.
import assert from "node:assert/strict";
const base = process.env.TEST_URL || "http://localhost:8080";
const stamp = Date.now();
function client() {
  const jar = new Map();
  return {
    jar,
    async call(
      path,
      body,
      method = body ? "POST" : "GET",
      status = 200,
      origin = base,
    ) {
      const response = await fetch(base + "/api/" + path, {
        method,
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
          Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      for (const cookie of response.headers.getSetCookie()) {
        const [name, value] = cookie.split(";")[0].split("=");
        jar.set(name, value);
      }
      const result = await response.json();
      assert.equal(
        response.status,
        status,
        `${method} ${path}: ${JSON.stringify(result)}`,
      );
      return result.data;
    },
  };
}
const a = client(),
  b = client();
const pass = "Testing123!";
for (const [i, c] of [a, b].entries()) {
  const email = `integration-${stamp}-${i}@example.com`;
  await c.call(
    "auth/register",
    {
      firstName: "Integration",
      lastName: "Test",
      email,
      password: pass,
      confirmPassword: pass,
    },
    "POST",
    201,
  );
  await c.call("auth/login", { email, password: pass, remember: true });
  await c.call("bootstrap", {});
}
const categories = await a.call("categories");
const expenseCat = categories.find((c) => c.type === "EXPENSE")._id,
  incomeCat = categories.find((c) => c.type === "INCOME")._id;
const account = await a.call(
  "accounts",
  {
    name: "Test account",
    type: "Bank Account",
    openingBalance: 1000,
    currency: "INR",
  },
  "POST",
  201,
);
const date = new Date().toISOString().slice(0, 10);
const expense = {
  type: "EXPENSE",
  amount: 125.25,
  description: "Test lunch",
  categoryId: expenseCat,
  accountId: account._id,
  date,
  paymentMethod: "UPI",
};
const ex = await a.call("expenses", expense, "POST", 201);
await a.call(
  "income",
  {
    ...expense,
    type: "INCOME",
    categoryId: incomeCat,
    amount: 500,
    description: "Test income",
  },
  "POST",
  201,
);
assert.equal((await a.call("accounts"))[0].balance, 1374.75);
await b.call("expenses/" + ex._id, undefined, "GET", 404);
await b.call("expenses/" + ex._id, expense, "PUT", 422); // refs also belong to a
await b.call("expenses/" + ex._id, undefined, "DELETE", 404);
assert.equal((await b.call("expenses")).pagination.totalRecords, 0);
await a.call("expenses", { ...expense, amount: -2 }, "POST", 422);
await a.call("expenses", expense, "POST", 403, "https://evil.example");
await a.call("accounts/" + account._id, undefined, "DELETE", 409);
const budget = await a.call(
  "budgets",
  {
    name: "Test budget",
    amount: 200,
    categoryId: expenseCat,
    startDate: date,
    endDate: date,
    period: "CUSTOM",
    alerts: [50, 75, 90, 100],
  },
  "POST",
  201,
);
assert.equal((await a.call("budgets/" + budget._id)).spent, 125.25);
assert.ok((await a.call("notifications")).some((n) => n.type === "budget"));
await a.call("expenses/" + ex._id, { ...expense, amount: 150 }, "PUT");
assert.equal((await a.call("accounts"))[0].balance, 1350);
assert.equal((await a.call("budgets/" + budget._id)).spent, 150);
const found = await a.call("expenses?search=lunch&pageSize=1");
assert.equal(found.pagination.totalRecords, 1);
assert.equal(found.items.length, 1);
const reports = await a.call("reports/monthly");
assert.equal(reports.income, 500);
assert.equal(reports.expense, 150);
await a.call("expenses/" + ex._id, undefined, "DELETE");
assert.equal((await a.call("accounts"))[0].balance, 1500);
assert.equal((await a.call("budgets/" + budget._id)).spent, 0);
const goal = await a.call(
  "savings",
  { name: "Laptop", targetAmount: 1000, currentAmount: 200, targetDate: date },
  "POST",
  201,
);
await a.call("savings/" + goal._id, { ...goal, currentAmount: 1000 }, "PUT");
assert.ok((await a.call("notifications")).some((n) => n.type === "savings"));
await a.call("admin/users", undefined, "GET", 403);
const oldRefresh = a.jar.get("refresh");
await a.call("auth/refresh", {});
assert.notEqual(a.jar.get("refresh"), oldRefresh);
const replay = client();
replay.jar.set("refresh", oldRefresh);
await replay.call("auth/refresh", {}, "POST", 401);
await a.call("auth/logout-all", {});
await a.call("auth/me", undefined, "GET", 401);
await a.call("auth/refresh", {}, "POST", 401);
console.log(
  "PASS: authentication, refresh replay rejection, user isolation, CSRF, CRUD, balances, budgets, notifications, filters, reports, savings and admin authorization.",
);
console.log(
  "Test users use email prefix integration-" +
    stamp +
    "; test data remains in this development database.",
);
