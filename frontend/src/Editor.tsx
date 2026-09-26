import { useState } from "react";
import { save, api } from "./api";
import { useApp } from "./context";
import { Modal, Field } from "./ui";
export const payments = [
  "Cash",
  "UPI",
  "Credit Card",
  "Debit Card",
  "Bank Transfer",
  "Net Banking",
  "Wallet",
  "Cheque",
  "Other",
];
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export function initial(kind: string, currency: string) {
  const date = localToday();
  const end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
  return {
    name: "",
    description: "",
    amount: "",
    categoryId: "",
    accountId: "",
    type: kind === "income" ? "INCOME" : "EXPENSE",
    date,
    paymentMethod: "UPI",
    merchant: "",
    source: "",
    tags: [],
    notes: "",
    openingBalance: 0,
    currency,
    active: true,
    icon: "tag",
    startDate: date,
    endDate:
      kind === "recurring"
        ? ""
        : `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`,
    period: "MONTHLY",
    alerts: [50, 75, 90, 100],
    frequency: "MONTHLY",
    intervalDays: 1,
    nextDate: date,
    targetAmount: "",
    currentAmount: 0,
    targetDate: date,
    status: "ACTIVE",
    ...(kind === "accounts" ? { type: "Bank Account" } : {}),
  };
}
export default function Editor({
  kind,
  record,
  categories,
  accounts,
  onClose,
  onSaved,
}: {
  kind: string;
  record?: any;
  categories: any[];
  accounts: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { prefs, toast } = useApp();
  const [v, setV] = useState<any>({
    ...initial(kind, prefs.currency),
    ...record,
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const finance = ["expenses", "income", "transactions", "recurring"].includes(
    kind,
  );
  const change = (k: string, value: any) =>
    setV((old: any) => ({
      ...old,
      [k]: value,
      ...(k === "type" ? { categoryId: "" } : {}),
    }));
  const input = (k: string, label: string, type = "text", required = false) => (
    <Field label={label}>
      <input
        type={type}
        value={v[k] ?? ""}
        required={required}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" && k !== "openingBalance" ? 0 : undefined}
        maxLength={type === "text" ? 2000 : undefined}
        onChange={(e) => change(k, e.target.value)}
      />
    </Field>
  );
  const select = (
    k: string,
    label: string,
    items: (string | { value: string; label: string })[],
    required = true,
  ) => (
    <Field label={label}>
      <select
        value={v[k] ?? ""}
        required={required}
        onChange={(e) => change(k, e.target.value)}
      >
        <option value="">{required ? "Select…" : "All categories"}</option>
        {items.map((x) =>
          typeof x === "string" ? (
            <option key={x}>{x}</option>
          ) : (
            <option key={x.value} value={x.value}>
              {x.label}
            </option>
          ),
        )}
      </select>
    </Field>
  );
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = { ...v };
      for (const k of [
        "amount",
        "openingBalance",
        "targetAmount",
        "currentAmount",
        "intervalDays",
      ])
        if (body[k] !== "" && body[k] !== undefined) body[k] = Number(body[k]);
      if (kind === "budgets") body.categoryId = body.categoryId || null;
      if (kind === "recurring") body.endDate = body.endDate || null;
      await save(
        kind + (record ? "/" + record._id : ""),
        body,
        record ? "PUT" : "POST",
      );
      toast("Saved successfully");
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const a = await api("attachments", { method: "POST", body: form });
      change("attachmentId", a._id);
      toast("Receipt uploaded");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`${record ? "Edit" : "Add"} ${kind === "savings" ? "savings goal" : kind === "recurring" ? "recurring transaction" : kind === "categories" ? "category" : kind.replace(/s$/, "")}`}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="form-grid">
          {!["expenses", "income", "transactions"].includes(kind) &&
            input("name", "Name", "text", true)}
          {(kind === "categories" ||
            kind === "recurring" ||
            kind === "transactions") &&
            select("type", "Transaction type", [
              { value: "EXPENSE", label: "Expense" },
              { value: "INCOME", label: "Income" },
            ])}
          {(finance || kind === "budgets") &&
            input("amount", "Amount (" + prefs.currency + ")", "number", true)}
          {(finance || kind === "budgets") &&
            select(
              "categoryId",
              "Category",
              categories
                .filter(
                  (c) =>
                    (c.active || c._id === v.categoryId) &&
                    c.type === (kind === "budgets" ? "EXPENSE" : v.type),
                )
                .map((c) => ({ value: c._id, label: c.name })),
              kind !== "budgets",
            )}
          {finance && (
            <>
              {select(
                "accountId",
                "Account",
                accounts
                  .filter((a) => a.active || a._id === v.accountId)
                  .map((a) => ({ value: a._id, label: a.name })),
              )}
              {select("paymentMethod", "Payment method", payments)}
              {kind !== "recurring" && input("date", "Date", "date", true)}
              {input("description", "Description", "text", true)}
              {input(
                v.type === "INCOME" ? "source" : "merchant",
                v.type === "INCOME" ? "Income source" : "Merchant",
              )}
              <Field label="Tags (comma separated)">
                <input
                  value={v.tags.join(",")}
                  onChange={(e) => change("tags", e.target.value.split(","))}
                />
              </Field>
              <Field label="Notes">
                <textarea
                  value={v.notes}
                  onChange={(e) => change("notes", e.target.value)}
                />
              </Field>
              {kind !== "recurring" && (
                <Field label="Receipt (PNG, JPEG, WebP, PDF; max 5 MB)">
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.pdf"
                    onChange={(e) => upload(e.target.files?.[0])}
                  />
                  {v.attachmentId && (
                    <span>
                      <a
                        href={"/api/attachments/" + v.attachmentId}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View receipt
                      </a>
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => change("attachmentId", null)}
                      >
                        Remove
                      </button>
                    </span>
                  )}
                </Field>
              )}
            </>
          )}
          {kind === "accounts" && (
            <>
              {select("type", "Account type", [
                "Cash",
                "Bank Account",
                "Credit Card",
                "Debit Card",
                "Wallet",
                "UPI",
                "Investment Account",
              ])}
              {input(
                "openingBalance",
                "Opening balance (" + prefs.currency + ")",
                "number",
                true,
              )}
              <p className="muted">
                Balances are calculated from the opening balance and all
                recorded transactions.
              </p>
            </>
          )}
          {kind === "budgets" && (
            <>
              {input("startDate", "Start date", "date", true)}
              {input("endDate", "End date", "date", true)}
              {select("period", "Repeat period", [
                "WEEKLY",
                "MONTHLY",
                "YEARLY",
                "CUSTOM",
              ])}
              <Field label="Alert thresholds">
                <div className="checks">
                  {[50, 75, 90, 100].map((n) => (
                    <label className="check" key={n}>
                      <input
                        type="checkbox"
                        checked={v.alerts.includes(n)}
                        onChange={(e) =>
                          change(
                            "alerts",
                            e.target.checked
                              ? [...v.alerts, n]
                              : v.alerts.filter((x: number) => x !== n),
                          )
                        }
                      />
                      {n}%
                    </label>
                  ))}
                </div>
              </Field>
              <small className="muted">
                Custom budgets do not repeat. Other budgets renew after their
                end date.
              </small>
            </>
          )}
          {kind === "recurring" && (
            <>
              {select("frequency", "Frequency", [
                "DAILY",
                "WEEKLY",
                "MONTHLY",
                "QUARTERLY",
                "YEARLY",
                "CUSTOM",
              ])}
              {v.frequency === "CUSTOM" &&
                input("intervalDays", "Every N days", "number", true)}
              {input("nextDate", "Next execution date", "date", true)}
              {input("endDate", "End date (optional)", "date")}
            </>
          )}
          {kind === "savings" && (
            <>
              {input("targetAmount", "Target amount", "number", true)}
              {input("currentAmount", "Already saved", "number", true)}
              {input("targetDate", "Target date", "date", true)}
              {select("status", "Status", ["ACTIVE", "COMPLETED", "PAUSED"])}
              <small className="muted">
                Savings progress is tracked separately; updating it does not
                move money between accounts.
              </small>
            </>
          )}
          {!finance && input("description", "Description")}
          {kind === "categories" && input("icon", "Icon label")}
          {["categories", "accounts", "budgets", "recurring"].includes(
            kind,
          ) && (
            <label className="check">
              <input
                type="checkbox"
                checked={v.active}
                onChange={(e) => change("active", e.target.checked)}
              />
              Active
            </label>
          )}
        </div>
        {finance && (!accounts.length || !categories.length) && (
          <p className="error">
            Create an account and category before adding transactions.
          </p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <footer>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
