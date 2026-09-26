import { useEffect, useState } from "react";
import { api } from "./api";
import { useApp } from "./context";
import Filters, { range, qs } from "./Filters";
import { exportRows } from "./exports";
import { Empty } from "./ui";
export default function Reports() {
  const { money, prefs, toast } = useApp();
  const [filters, setFilters] = useState<any>(range("month")),
    [kind, setKind] = useState("monthly"),
    [data, setData] = useState<any>(null),
    [cats, setCats] = useState<any[]>([]),
    [accounts, setAccounts] = useState<any[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    setData(null);
    Promise.all([
      api("reports/" + kind + "?" + qs(filters)),
      api("categories"),
      api("accounts"),
    ])
      .then(([d, c, a]) => {
        if (live) {
          setData(d);
          setCats(c);
          setAccounts(a);
          setError("");
        }
      })
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [filters, kind]);
  async function download(format: string) {
    setBusy(true);
    try {
      if (kind === "budget") {
        const rows = data
          .filter(
            (b: any) =>
              (!filters.from || b.endDate >= filters.from) &&
              (!filters.to || b.startDate <= filters.to),
          )
          .map((b: any) => ({
            date: b.startDate,
            type: "BUDGET",
            description: b.name,
            category:
              cats.find((c) => c._id === b.categoryId)?.name ??
              "All categories",
            notes: `Spent ${b.spent}; remaining ${b.remaining}; ends ${b.endDate}`,
            amount: b.amount,
          }));
        await exportRows(format, rows, prefs.currency, "Daybook budgets");
      } else
        await exportRows(
          format,
          data.items,
          prefs.currency,
          "Daybook " + kind + " report",
        );
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const budgets =
    kind === "budget" && Array.isArray(data)
      ? data.filter(
          (b: any) =>
            (!filters.from || b.endDate >= filters.from) &&
            (!filters.to || b.startDate <= filters.to) &&
            (!filters.categoryId || b.categoryId === filters.categoryId),
        )
      : [];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE BIGGER PICTURE</span>
          <h1>Reports</h1>
        </div>
        <div className="button-group">
          {["csv", "xlsx", "pdf"].map((f) => (
            <button
              key={f}
              disabled={!data || busy}
              onClick={() => download(f)}
            >
              {f === "xlsx" ? "Excel" : f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <section className="panel">
        <div className="toolbar">
          <label>
            Report{" "}
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              {[
                "daily",
                "weekly",
                "monthly",
                "yearly",
                "category",
                "accounts",
                "payment-method",
                "income",
                "expense",
                "income-expense",
                "budget",
              ].map((x) => (
                <option key={x} value={x}>
                  {x.replaceAll("-", " ").replace(/^./, (s) => s.toUpperCase())}
                </option>
              ))}
            </select>
          </label>
          {!["budget", "income", "expense"].includes(kind) && (
            <label>
              Type{" "}
              <select
                value={filters.type ?? ""}
                onChange={(e) =>
                  setFilters({ ...filters, type: e.target.value })
                }
              >
                <option value="">Income and expenses</option>
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </select>
            </label>
          )}
        </div>
        <Filters
          value={filters}
          onChange={setFilters}
          categories={cats}
          accounts={accounts}
        />
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {!data ? (
          <p className="pad">Loading report…</p>
        ) : kind === "budget" ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Budget</th>
                  <th>Budget amount</th>
                  <th>Spent</th>
                  <th>Remaining</th>
                  <th>Usage</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((b: any) => (
                  <tr key={b._id}>
                    <td>{b.name}</td>
                    <td>{money(b.amount)}</td>
                    <td>{money(b.spent)}</td>
                    <td>{money(b.remaining)}</td>
                    <td>{b.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!budgets.length && <Empty />}
          </div>
        ) : (
          <>
            <div className="report-totals">
              <span>
                Income{" "}
                <strong className="positive">{money(data.income)}</strong>
              </span>
              <span>
                Expenses <strong>{money(data.expense)}</strong>
              </span>
              <span>
                Net <strong>{money(data.income - data.expense)}</strong>
              </span>
            </div>
            {data.groups.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Period / group</th>
                      <th>Income</th>
                      <th>Expenses</th>
                      <th>Net savings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.groups.map((r: any) => (
                      <tr key={r.name}>
                        <td>{r.name || "Unspecified"}</td>
                        <td>{money(r.income)}</td>
                        <td>{money(r.expense)}</td>
                        <td
                          className={
                            r.income - r.expense >= 0 ? "positive" : "negative"
                          }
                        >
                          {money(r.income - r.expense)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty text="No transactions match these filters." />
            )}
            <p className="pad muted">
              {data.items.length} transactions included. Exports contain every
              matching transaction.
            </p>
          </>
        )}
      </section>
    </>
  );
}
