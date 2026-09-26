import { Field } from "./ui";
import { payments } from "./Editor";
export const qs = (v: Record<string, any>) =>
  new URLSearchParams(
    Object.entries(v)
      .filter(([, x]) => x !== "" && x !== undefined)
      .map(([k, v]) => [k, String(v)]),
  ).toString();
function day(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function range(preset: string) {
  const now = new Date(),
    a = new Date(now),
    b = new Date(now);
  if (preset === "yesterday") {
    a.setDate(a.getDate() - 1);
    b.setDate(b.getDate() - 1);
  }
  if (preset === "week" || preset === "last-week") {
    a.setDate(a.getDate() - ((a.getDay() + 6) % 7));
    if (preset === "last-week") {
      a.setDate(a.getDate() - 7);
      b.setTime(a.getTime());
      b.setDate(b.getDate() + 6);
    }
  }
  if (preset === "month" || preset === "last-month") {
    a.setDate(1);
    if (preset === "last-month") {
      a.setMonth(a.getMonth() - 1);
      b.setDate(0);
    }
  }
  return { from: day(a), to: day(b) };
}
export default function Filters({
  value,
  onChange,
  categories,
  accounts,
  advanced = true,
}: {
  value: any;
  onChange: (v: any) => void;
  categories: any[];
  accounts: any[];
  advanced?: boolean;
}) {
  const change = (k: string, v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="filters">
      <Field label="Date range">
        <select
          defaultValue="custom"
          onChange={(e) =>
            onChange({
              ...value,
              ...(e.target.value === "all"
                ? { from: "", to: "" }
                : e.target.value === "custom"
                  ? {}
                  : range(e.target.value)),
            })
          }
        >
          <option value="custom">Custom dates</option>
          <option value="all">All time</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">This week</option>
          <option value="last-week">Last week</option>
          <option value="month">This month</option>
          <option value="last-month">Last month</option>
        </select>
      </Field>
      <Field label="From">
        <input
          type="date"
          value={value.from ?? ""}
          onChange={(e) => change("from", e.target.value)}
        />
      </Field>
      <Field label="To">
        <input
          type="date"
          value={value.to ?? ""}
          onChange={(e) => change("to", e.target.value)}
        />
      </Field>
      {advanced && (
        <>
          <Field label="Category">
            <select
              value={value.categoryId ?? ""}
              onChange={(e) => change("categoryId", e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.type === "EXPENSE" ? "Expense" : "Income"})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Account">
            <select
              value={value.accountId ?? ""}
              onChange={(e) => change("accountId", e.target.value)}
            >
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Payment">
            <select
              value={value.paymentMethod ?? ""}
              onChange={(e) => change("paymentMethod", e.target.value)}
            >
              <option value="">All methods</option>
              {payments.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          {[
            ["minAmount", "Minimum amount"],
            ["maxAmount", "Maximum amount"],
            ["merchant", "Merchant"],
            ["tags", "Tag"],
          ].map(([k, l]) => (
            <Field key={k} label={l}>
              <input
                value={value[k] ?? ""}
                type={k.includes("Amount") ? "number" : "text"}
                min="0"
                step="0.01"
                onChange={(e) => change(k, e.target.value)}
              />
            </Field>
          ))}
        </>
      )}
      <button onClick={() => onChange({})}>Clear filters</button>
    </div>
  );
}
