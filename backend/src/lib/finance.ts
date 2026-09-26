import { ObjectId, type Document } from "mongodb";
import { NextRequest } from "next/server";
import { db, rows } from "./db";
import {
  ApiError,
  schemas,
  transaction,
  cents,
  fromCents,
  id,
  date,
  escapeRegex,
  aggregate,
  today,
  advanceDate,
} from "./domain";
import { ok, sendMail } from "./auth";
export const defaults = {
  EXPENSE: [
    "Food",
    "Groceries",
    "Transport",
    "Fuel",
    "Shopping",
    "Entertainment",
    "Rent",
    "Electricity",
    "Internet",
    "Mobile",
    "Medical",
    "Education",
    "Travel",
    "Insurance",
    "Loan",
    "EMI",
    "Investment",
    "Subscription",
    "Family",
    "Gifts",
    "Personal Care",
    "Other",
  ],
  INCOME: [
    "Salary",
    "Freelance",
    "Business",
    "Investment",
    "Interest",
    "Rental",
    "Gift",
    "Bonus",
    "Refund",
    "Other",
  ],
};
export async function preferences(userId: string) {
  return (
    (await (await db()).collection("preferences").findOne({ userId })) ?? {
      currency: "INR",
      timezone: "Asia/Kolkata",
      theme: "system",
      dateFormat: "DD/MM/YYYY",
      language: "en",
      country: "India",
      emailNotifications: false,
      budgetAlerts: true,
      recurringReminders: true,
      monthlyReports: true,
    }
  );
}
export async function bootstrap(userId: string) {
  const d = await db();
  if ((await d.collection("categories").countDocuments({ userId })) === 0) {
    const configured = await d
      .collection("config")
      .findOne({ key: "defaults" });
    const list =
      configured?.categories ??
      Object.entries(defaults).flatMap(([type, names]) =>
        names.map((name) => ({ name, type })),
      );
    for (const c of list)
      await d
        .collection("categories")
        .updateOne(
          { userId, name: c.name, type: c.type },
          {
            $setOnInsert: {
              ...c,
              userId,
              icon: "tag",
              active: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: userId,
              updatedBy: userId,
            },
          },
          { upsert: true },
        );
  }
  return ok({ preferences: await preferences(userId) });
}
export function serialize(v: any): any {
  if (v instanceof ObjectId) return v.toHexString();
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(serialize);
  if (v && typeof v === "object") {
    const result: any = {};
    for (const [k, x] of Object.entries(v)) {
      if (["userId", "createdBy", "updatedBy", "data"].includes(k)) continue;
      result[k] = serialize(x);
    }
    for (const [a, b] of [
      ["amountMinor", "amount"],
      ["openingMinor", "openingBalance"],
      ["targetMinor", "targetAmount"],
      ["currentMinor", "currentAmount"],
    ])
      if (a in v) result[b] = fromCents(v[a]);
    return result;
  }
  return v;
}
async function reference(
  userId: string,
  collection: string,
  value: string | null | undefined,
  type?: string,
) {
  if (!value) return;
  const r = await (await db())
    .collection(collection)
    .findOne({
      _id: new ObjectId(id.parse(value)),
      userId,
      deleted: { $ne: true },
    });
  if (!r || r.active === false || (type && r.type !== type))
    throw new ApiError(
      422,
      `Select an active ${type?.toLowerCase() ?? ""} ${collection === "categories" ? "category" : collection === "accounts" ? "account" : "attachment"}`,
    );
  return r;
}
async function validateRefs(userId: string, b: any) {
  if (b.categoryId)
    await reference(userId, "categories", b.categoryId, b.type ?? "EXPENSE");
  if (b.accountId) await reference(userId, "accounts", b.accountId);
  if (b.attachmentId) await reference(userId, "attachments", b.attachmentId);
}
function storage(b: any) {
  const result = { ...b };
  for (const [a, k] of [
    ["amount", "amountMinor"],
    ["openingBalance", "openingMinor"],
    ["targetAmount", "targetMinor"],
    ["currentAmount", "currentMinor"],
  ])
    if (a in result) {
      result[k] = cents(result[a]);
      delete result[a];
    }
  return result;
}
export async function transactionFilter(
  userId: string,
  q: URLSearchParams,
  forcedType?: string,
) {
  const f: Document = { userId, deleted: { $ne: true } };
  const type = forcedType ?? q.get("type");
  if (type) {
    if (!["EXPENSE", "INCOME"].includes(type))
      throw new ApiError(422, "Invalid transaction type");
    f.type = type;
  }
  if (q.get("from") || q.get("to")) {
    f.date = {};
    if (q.get("from")) f.date.$gte = date.parse(q.get("from"));
    if (q.get("to")) f.date.$lte = date.parse(q.get("to"));
    if (f.date.$gte && f.date.$lte && f.date.$gte > f.date.$lte)
      throw new ApiError(422, "Invalid date range");
  }
  for (const field of [
    "categoryId",
    "accountId",
    "paymentMethod",
    "merchant",
    "tags",
  ])
    if (q.get(field))
      f[field] = ["categoryId", "accountId"].includes(field)
        ? id.parse(q.get(field))
        : q.get(field)!.slice(0, 100);
  for (const [field, op] of [
    ["minAmount", "$gte"],
    ["maxAmount", "$lte"],
  ])
    if (q.get(field)) {
      const n = Number(q.get(field));
      if (!Number.isFinite(n) || n < 0)
        throw new ApiError(422, "Invalid amount filter");
      f.amountMinor ??= {};
      f.amountMinor[op] = cents(n);
    }
  const search = q.get("search")?.trim().slice(0, 100);
  if (search) {
    const r = { $regex: escapeRegex(search), $options: "i" };
    const cats = await (await db())
      .collection("categories")
      .find({ userId, name: r })
      .project({ _id: 1 })
      .toArray();
    f.$or = ["description", "merchant", "source", "notes", "tags"].map((k) => ({
      [k]: r,
    }));
    f.$or.push({ categoryId: { $in: cats.map((c) => c._id.toHexString()) } });
    if (Number.isFinite(Number(search)))
      f.$or.push({ amountMinor: cents(Number(search)) });
  }
  return f;
}
export async function transactions(
  req: NextRequest,
  userId: string,
  recordId?: string,
  forcedType?: string,
) {
  const d = await db(),
    c = d.collection("transactions");
  const q = req.nextUrl.searchParams;
  if (req.method === "GET") {
    if (
      recordId &&
      !["search", "summary", "category-summary"].includes(recordId)
    ) {
      const r = await c.findOne({
        _id: new ObjectId(id.parse(recordId)),
        userId,
        deleted: { $ne: true },
        ...(forcedType ? { type: forcedType } : {}),
      });
      if (!r) throw new ApiError(404, "Transaction not found");
      return ok(serialize(r));
    }
    const f = await transactionFilter(userId, q, forcedType);
    if (recordId === "summary" || recordId === "category-summary") {
      const list = await c.find(f).toArray();
      return ok(
        aggregate(
          list,
          recordId === "category-summary" ? "categoryId" : "type",
        ),
      );
    }
    const page = Math.max(1, Math.floor(Number(q.get("page")) || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Math.floor(Number(q.get("pageSize")) || 10)),
    );
    const sortKey = [
      "date",
      "amountMinor",
      "description",
      "category",
      "createdAt",
      "updatedAt",
    ].includes(q.get("sort") ?? "")
      ? q.get("sort")!
      : "date";
    const sortDir = q.get("order") === "asc" ? 1 : -1;
    const [data, total] = await Promise.all([
      sortKey === "category"
        ? c
            .aggregate([
              { $match: f },
              { $addFields: { catObjectId: { $toObjectId: "$categoryId" } } },
              {
                $lookup: {
                  from: "categories",
                  let: { cid: "$catObjectId" },
                  pipeline: [
                    { $match: { userId, $expr: { $eq: ["$_id", "$$cid"] } } },
                  ],
                  as: "cat",
                },
              },
              { $addFields: { category: { $arrayElemAt: ["$cat.name", 0] } } },
              { $sort: { category: sortDir, _id: -1 } },
              { $skip: (page - 1) * pageSize },
              { $limit: pageSize },
              { $unset: ["cat", "catObjectId"] },
            ])
            .toArray()
        : c
            .find(f)
            .sort({ [sortKey]: sortDir, _id: -1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .toArray(),
      c.countDocuments(f),
    ]);
    return ok({
      items: serialize(data),
      pagination: {
        page,
        pageSize,
        totalRecords: total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  }
  if (!["POST", "PUT", "DELETE"].includes(req.method))
    throw new ApiError(405, "Method not allowed");
  const filter = {
    _id: recordId ? new ObjectId(id.parse(recordId)) : new ObjectId(),
    userId,
    deleted: { $ne: true },
    ...(forcedType ? { type: forcedType } : {}),
  };
  if (req.method === "DELETE") {
    const r = await c.updateOne(filter, {
      $set: { deleted: true, deletedAt: new Date(), deletedBy: userId },
    });
    if (!r.matchedCount) throw new ApiError(404, "Transaction not found");
    return ok();
  }
  const raw = await req.json();
  const b = transaction.parse({
    ...raw,
    ...(forcedType ? { type: forcedType } : {}),
  });
  await validateRefs(userId, b);
  const saved = { ...storage(b), updatedAt: new Date(), updatedBy: userId };
  if (req.method === "PUT") {
    if (!recordId) throw new ApiError(400, "Transaction ID required");
    const r = await c.updateOne(filter, { $set: saved });
    if (!r.matchedCount) throw new ApiError(404, "Transaction not found");
  } else {
    await c.insertOne({
      ...saved,
      _id: filter._id,
      userId,
      createdAt: new Date(),
      createdBy: userId,
    });
  }
  await budgetNotifications(userId);
  return ok(
    serialize(await c.findOne({ _id: filter._id, userId })),
    "Transaction saved",
    req.method === "POST" ? 201 : 200,
  );
}
export async function resources(
  req: NextRequest,
  userId: string,
  kind: keyof typeof schemas,
  recordId?: string,
) {
  const d = await db(),
    c = d.collection(kind);
  const f = {
    userId,
    deleted: { $ne: true },
    ...(recordId ? { _id: new ObjectId(id.parse(recordId)) } : {}),
  };
  if (req.method === "GET") {
    const records = await c.find(f).sort({ createdAt: -1 }).toArray();
    if (recordId && !records.length)
      throw new ApiError(404, "Record not found");
    if (kind === "accounts") {
      const totals = await d
        .collection("transactions")
        .aggregate([
          { $match: { userId, deleted: { $ne: true } } },
          {
            $group: {
              _id: "$accountId",
              total: {
                $sum: {
                  $cond: [
                    { $eq: ["$type", "INCOME"] },
                    "$amountMinor",
                    { $multiply: ["$amountMinor", -1] },
                  ],
                },
              },
            },
          },
        ])
        .toArray();
      for (const r of records)
        r.balance = fromCents(
          (r.openingMinor ?? 0) +
            (totals.find((t) => t._id === r._id.toHexString())?.total ?? 0),
        );
    }
    if (kind === "budgets")
      for (const r of records) Object.assign(r, await budgetUsage(userId, r));
    return ok(serialize(recordId ? records[0] : records));
  }
  if (!["POST", "PUT", "DELETE"].includes(req.method))
    throw new ApiError(405, "Method not allowed");
  if (req.method !== "POST" && !recordId)
    throw new ApiError(400, "Record ID required");
  if (req.method === "DELETE") {
    if (["accounts", "categories"].includes(kind)) {
      const field = kind === "accounts" ? "accountId" : "categoryId";
      for (const collection of ["transactions", "recurring", "budgets"])
        if (
          await d
            .collection(collection)
            .countDocuments({
              userId,
              [field]: recordId,
              deleted: { $ne: true },
            })
        )
          throw new ApiError(
            409,
            "This record is in use. Edit it and mark it inactive instead.",
          );
    }
    const r = await c.updateOne(f, {
      $set: { deleted: true, deletedAt: new Date(), deletedBy: userId },
    });
    if (!r.matchedCount) throw new ApiError(404, "Record not found");
    return ok();
  }
  const b: any = schemas[kind].parse(await req.json());
  if (kind === "budgets" || kind === "recurring") await validateRefs(userId, b);
  if (
    kind === "accounts" &&
    b.currency !== (await preferences(userId)).currency
  )
    throw new ApiError(
      422,
      "Account currency must match your profile currency. Currency conversion is not supported.",
    );
  if (kind === "categories" && recordId) {
    const old = await c.findOne(f);
    if (old && old.type !== b.type)
      for (const col of ["transactions", "recurring", "budgets"])
        if (
          await d
            .collection(col)
            .countDocuments({
              userId,
              categoryId: recordId,
              deleted: { $ne: true },
            })
        )
          throw new ApiError(
            409,
            "Cannot change the type of a category in use",
          );
  }
  const prior = kind === "recurring" && recordId ? await c.findOne(f) : null;
  const saved = {
    ...storage(b),
    updatedAt: new Date(),
    updatedBy: userId,
    ...(kind === "recurring"
      ? {
          anchorDay:
            prior && prior.nextDate === b.nextDate
              ? prior.anchorDay
              : Number(b.nextDate.slice(8)),
        }
      : {}),
  };
  if (req.method === "PUT") {
    const r = await c.updateOne(f, { $set: saved });
    if (!r.matchedCount) throw new ApiError(404, "Record not found");
  } else {
    const r = await c.insertOne({
      ...saved,
      userId,
      createdAt: new Date(),
      createdBy: userId,
    });
    recordId = r.insertedId.toHexString();
  }
  if (kind === "savings")
    await notify(
      userId,
      `goal:${recordId}:${b.currentAmount >= b.targetAmount ? "complete" : Math.floor((b.currentAmount / b.targetAmount) * 4)}`,
      b.currentAmount >= b.targetAmount
        ? `${b.name}: savings target reached`
        : `${b.name}: ${Math.round((b.currentAmount / b.targetAmount) * 100)}% saved`,
      "savings",
    );
  if (kind === "budgets") await budgetNotifications(userId);
  return ok(
    serialize(await c.findOne({ _id: new ObjectId(recordId), userId })),
    "Saved",
    req.method === "POST" ? 201 : 200,
  );
}
export async function budgetUsage(userId: string, b: any) {
  const d = await db();
  const f: Document = {
    userId,
    deleted: { $ne: true },
    type: "EXPENSE",
    date: { $gte: b.startDate, $lte: b.endDate },
  };
  if (b.categoryId) f.categoryId = b.categoryId;
  const [sum] = await d
    .collection("transactions")
    .aggregate([
      { $match: f },
      { $group: { _id: null, total: { $sum: "$amountMinor" } } },
    ])
    .toArray();
  const spent = sum?.total ?? 0;
  return {
    spent: fromCents(spent),
    remaining: fromCents(b.amountMinor - spent),
    percent: Math.round((spent / b.amountMinor) * 100),
  };
}
export async function notify(
  userId: string,
  key: string,
  message: string,
  type: string,
) {
  const d = await db();
  const r = await d
    .collection("notifications")
    .updateOne(
      { userId, key },
      {
        $setOnInsert: {
          userId,
          key,
          message,
          type,
          read: false,
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );
  if (r.upsertedCount) {
    const p = await preferences(userId);
    if (p.emailNotifications) {
      const [u] = await rows(
        "SELECT email FROM users WHERE id=? AND status=?",
        [userId, "ACTIVE"],
      );
      if (u)
        try {
          await sendMail(u.email, "Daybook notification", message);
        } catch {
          console.error("Notification email delivery failed");
        }
    }
  }
}
export async function budgetNotifications(userId: string) {
  if (!(await preferences(userId)).budgetAlerts) return;
  const d = await db();
  const bs = await d
    .collection("budgets")
    .find({ userId, deleted: { $ne: true }, active: true })
    .toArray();
  for (const b of bs) {
    const usage = await budgetUsage(userId, b);
    for (const threshold of b.alerts)
      if (usage.percent >= threshold)
        await notify(
          userId,
          `budget:${b._id}:${b.startDate}:${threshold}`,
          `${b.name}: ${threshold}% threshold reached. Spent ${usage.spent} of ${fromCents(b.amountMinor)}.`,
          "budget",
        );
  }
}
export async function reportData(
  userId: string,
  q: URLSearchParams,
  report = "daily",
) {
  const d = await db();
  const f = await transactionFilter(userId, q);
  const data = await d
    .collection("transactions")
    .find(f)
    .sort({ date: 1 })
    .toArray();
  const cats = await d.collection("categories").find({ userId }).toArray(),
    accounts = await d.collection("accounts").find({ userId }).toArray();
  for (const t of data) {
    t.category =
      cats.find((c) => c._id.toHexString() === t.categoryId)?.name ??
      "Archived";
    t.account =
      accounts.find((c) => c._id.toHexString() === t.accountId)?.name ??
      "Archived";
    t.month = t.date.slice(0, 7);
    t.year = t.date.slice(0, 4);
    const day = new Date(t.date + "T00:00:00Z");
    day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
    t.week = day.toISOString().slice(0, 10);
  }
  const grouping: Record<string, string> = {
    daily: "date",
    weekly: "week",
    monthly: "month",
    yearly: "year",
    category: "category",
    accounts: "account",
    "payment-method": "paymentMethod",
    income: "source",
    expense: "category",
    "income-expense": "month",
  };
  return {
    items: serialize(data),
    groups: aggregate(data, grouping[report] ?? "date"),
    income: fromCents(
      data
        .filter((t) => t.type === "INCOME")
        .reduce((s, t) => s + t.amountMinor, 0),
    ),
    expense: fromCents(
      data
        .filter((t) => t.type === "EXPENSE")
        .reduce((s, t) => s + t.amountMinor, 0),
    ),
  };
}
export async function dashboard(userId: string, q: URLSearchParams) {
  const d = await db();
  const p = await preferences(userId),
    now = today(p.timezone);
  const data = await reportData(userId, q, "monthly");
  const [balances] = await d
    .collection("transactions")
    .aggregate([
      { $match: { userId, deleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $cond: [
                { $eq: ["$type", "INCOME"] },
                "$amountMinor",
                { $multiply: ["$amountMinor", -1] },
              ],
            },
          },
        },
      },
    ])
    .toArray();
  const accounts = await d
    .collection("accounts")
    .find({ userId, deleted: { $ne: true } })
    .toArray();
  const bs = await d
    .collection("budgets")
    .find({
      userId,
      deleted: { $ne: true },
      active: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
    .toArray();
  const budgets = await Promise.all(
    bs.map(async (b) => ({
      ...serialize(b),
      ...(await budgetUsage(userId, b)),
    })),
  );
  const current = await reportData(
    userId,
    new URLSearchParams({
      from: now.slice(0, 7) + "-01",
      to: now,
      type: "EXPENSE",
    }),
  );
  return {
    income: data.income,
    expense: data.expense,
    savings: fromCents(cents(data.income) - cents(data.expense)),
    balance: fromCents(
      (balances?.total ?? 0) + accounts.reduce((s, a) => s + a.openingMinor, 0),
    ),
    todayExpense: fromCents(
      current.items
        .filter((x: any) => x.date === now)
        .reduce((s: number, t: any) => s + cents(t.amount), 0),
    ),
    monthExpense: current.expense,
    remainingBudget: fromCents(
      budgets.reduce((s, b) => s + cents(b.remaining), 0),
    ),
    budgets,
    monthly: data.groups,
    categories: aggregate(
      (
        await d
          .collection("transactions")
          .find({ ...(await transactionFilter(userId, q)), type: "EXPENSE" })
          .toArray()
      ).map((t) => ({
        ...t,
        category:
          data.items.find((i: any) => i._id === t._id.toHexString())
            ?.category ?? "Other",
      })),
      "category",
    ),
    trend: aggregate(
      data.items.map((t: any) => ({ ...t, amountMinor: cents(t.amount) })),
      "date",
    ),
    recent: data.items.slice(-6).reverse(),
  };
}
