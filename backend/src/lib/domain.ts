import { z } from "zod";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "REQUEST_ERROR",
  ) {
    super(message);
  }
}
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
    "Invalid calendar date",
  );
export const id = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid record ID");
const text = z.string().trim().max(2000).default("");
const name = z.string().trim().min(1).max(100);
export const money = z
  .number()
  .finite()
  .nonnegative()
  .max(1e10)
  .refine(
    (v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.0001,
    "Use at most two decimal places",
  );
export const password = z
  .string()
  .min(8)
  .max(72)
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[0-9]/, "Include a number")
  .regex(/[^a-zA-Z0-9]/, "Include a special character");
export const paymentMethods = [
  "Cash",
  "UPI",
  "Credit Card",
  "Debit Card",
  "Bank Transfer",
  "Net Banking",
  "Wallet",
  "Cheque",
  "Other",
] as const;
export const transaction = z.object({
  type: z.enum(["EXPENSE", "INCOME"]),
  amount: money.refine((v) => v > 0),
  categoryId: id,
  accountId: id,
  date,
  paymentMethod: z.enum(paymentMethods),
  description: name,
  merchant: text,
  source: text,
  tags: z.array(z.string().trim().max(50)).max(20).default([]),
  notes: text,
  attachmentId: id.nullable().optional(),
});
export const schemas = {
  categories: z.object({
    name,
    type: z.enum(["EXPENSE", "INCOME"]),
    icon: z.string().max(50).default("tag"),
    description: text,
    active: z.boolean().default(true),
  }),
  accounts: z.object({
    name,
    type: z.enum([
      "Cash",
      "Bank Account",
      "Credit Card",
      "Debit Card",
      "Wallet",
      "UPI",
      "Investment Account",
    ]),
    openingBalance: z
      .number()
      .finite()
      .min(-1e10)
      .max(1e10)
      .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.0001),
    currency: z.literal("INR").or(z.enum(["USD", "EUR", "GBP", "JPY"])),
    description: text,
    active: z.boolean().default(true),
  }),
  budgets: z
    .object({
      name,
      categoryId: id.nullable().default(null),
      amount: money.refine((v) => v > 0),
      startDate: date,
      endDate: date,
      period: z
        .enum(["WEEKLY", "MONTHLY", "YEARLY", "CUSTOM"])
        .default("MONTHLY"),
      alerts: z
        .array(z.number().int().min(1).max(100))
        .min(1)
        .default([50, 75, 90, 100]),
      active: z.boolean().default(true),
    })
    .refine((v) => v.endDate >= v.startDate, "End date must follow start date"),
  recurring: transaction
    .omit({ date: true, attachmentId: true })
    .extend({
      name,
      frequency: z.enum([
        "DAILY",
        "WEEKLY",
        "MONTHLY",
        "QUARTERLY",
        "YEARLY",
        "CUSTOM",
      ]),
      intervalDays: z.number().int().min(1).max(3650).default(1),
      nextDate: date,
      endDate: date.nullable().default(null),
      active: z.boolean().default(true),
    })
    .refine(
      (v) => !v.endDate || v.endDate >= v.nextDate,
      "End date must follow next date",
    ),
  savings: z.object({
    name,
    targetAmount: money.refine((v) => v > 0),
    currentAmount: money,
    targetDate: date,
    description: text,
    status: z.enum(["ACTIVE", "COMPLETED", "PAUSED"]).default("ACTIVE"),
  }),
};
export function cents(amount: number) {
  return Math.round(amount * 100);
}
export function fromCents(amount: number) {
  return amount / 100;
}
export function today(timeZone = "UTC") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function advanceDate(
  value: string,
  frequency: string,
  intervalDays = 1,
  anchorDay?: number,
) {
  const d = new Date(value + "T00:00:00Z");
  if (["MONTHLY", "QUARTERLY", "YEARLY"].includes(frequency)) {
    const target = anchorDay ?? d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(
      d.getUTCMonth() +
        ({ MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 }[frequency] ?? 1),
    );
    const last = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
    ).getUTCDate();
    d.setUTCDate(Math.min(target, last));
  } else
    d.setUTCDate(
      d.getUTCDate() +
        (frequency === "DAILY" ? 1 : frequency === "WEEKLY" ? 7 : intervalDays),
    );
  return d.toISOString().slice(0, 10);
}
export function escapeRegex(v: string) {
  return v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
export function aggregate(items: Record<string, any>[], key: string) {
  const result: Record<
    string,
    { name: string; income: number; expense: number }
  > = {};
  for (const t of items) {
    const label = String(t[key] ?? "Other");
    result[label] ??= { name: label, income: 0, expense: 0 };
    result[label][t.type === "INCOME" ? "income" : "expense"] += t.amountMinor;
  }
  return Object.values(result)
    .map((r) => ({
      ...r,
      income: fromCents(r.income),
      expense: fromCents(r.expense),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
