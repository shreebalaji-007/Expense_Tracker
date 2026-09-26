import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  SlidersHorizontal,
  Pencil,
  Trash2,
  Download,
  Paperclip,
} from "lucide-react";
import { api, save } from "./api";
import { useApp } from "./context";
import Editor from "./Editor";
import Filters, { qs } from "./Filters";
import { Empty, Modal, MoneyType, Progress } from "./ui";
import { exportRows } from "./exports";
export const titles: Record<string, string> = {
  transactions: "All transactions",
  expenses: "Expenses",
  income: "Income",
  accounts: "Accounts",
  categories: "Categories",
  budgets: "Budgets",
  recurring: "Recurring transactions",
  savings: "Savings goals",
};
export default function Records({ kind }: { kind: string }) {
  const { money, prefs, toast, formatDate } = useApp();
  const [data, setData] = useState<any[]>([]),
    [categories, setCats] = useState<any[]>([]),
    [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [filters, setFilters] = useState<any>({}),
    [search, setSearch] = useState(""),
    [debounced, setDebounced] = useState(""),
    [showFilters, setShowFilters] = useState(false),
    [page, setPage] = useState(1),
    [pagination, setPagination] = useState<any>({}),
    [sort, setSort] = useState("date"),
    [order, setOrder] = useState("desc");
  const [editing, setEditing] = useState<any>(undefined),
    [deleting, setDeleting] = useState<any>(null),
    [version, setVersion] = useState(0),
    [busy, setBusy] = useState(false);
  const isTx = ["expenses", "income", "transactions"].includes(kind);
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    let live = true;
    setLoading(true);
    Promise.all([
      api(
        kind +
          (isTx
            ? "?" +
              qs({
                ...filters,
                search: debounced,
                page,
                pageSize: 10,
                sort,
                order,
              })
            : ""),
      ),
      api("categories"),
      api("accounts"),
    ])
      .then(([d, c, a]) => {
        if (live) {
          setData(isTx ? d.items : d);
          setPagination(isTx ? d.pagination : {});
          setCats(c);
          setAccounts(a);
          setError("");
        }
      })
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [kind, filters, debounced, page, sort, order, version]);
  async function remove() {
    setBusy(true);
    try {
      await api(kind + "/" + deleting._id, { method: "DELETE" });
      setDeleting(null);
      setVersion((v) => v + 1);
      setPage(1);
      toast("Deleted successfully");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function download(format: string) {
    setBusy(true);
    try {
      const r = await api(
        "reports/daily?" +
          qs({
            ...filters,
            search: debounced,
            ...(kind === "expenses"
              ? { type: "EXPENSE" }
              : kind === "income"
                ? { type: "INCOME" }
                : {}),
          }),
      );
      await exportRows(format, r.items, prefs.currency);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const actions = (r: any) => (
    <div className="row-actions">
      <button
        className="icon-btn"
        aria-label={"Edit " + (r.description || r.name)}
        onClick={() => setEditing(r)}
      >
        <Pencil size={16} />
      </button>
      <button
        className="icon-btn danger"
        aria-label={"Delete " + (r.description || r.name)}
        onClick={() => setDeleting(r)}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
  const listed = isTx
    ? data
    : data.filter((r) =>
        JSON.stringify(r).toLowerCase().includes(search.toLowerCase()),
      );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR MONEY, ORGANIZED</span>
          <h1>{titles[kind]}</h1>
        </div>
        <button className="primary" onClick={() => setEditing(null)}>
          <Plus size={18} />
          Add{" "}
          {kind === "savings"
            ? "goal"
            : kind === "categories"
              ? "category"
              : kind === "recurring"
                ? "schedule"
                : kind === "income"
                  ? "income"
                  : kind === "transactions"
                    ? "transaction"
                    : kind.replace(/s$/, "")}
        </button>
      </div>
      <section className="panel">
        <div className="toolbar">
          <div className="search">
            <Search size={18} />
            <input
              aria-label="Search records"
              placeholder="Search your records…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {loading && <span className="loading-text">Loading…</span>}
          </div>
          {isTx && (
            <>
              <button onClick={() => setShowFilters(!showFilters)}>
                <SlidersHorizontal size={17} />
                Filters
              </button>
              <select
                aria-label="Sort by"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="date">Date</option>
                <option value="amountMinor">Amount</option>
                <option value="description">Description</option>
                <option value="category">Category</option>
                <option value="createdAt">Created date</option>
                <option value="updatedAt">Updated date</option>
              </select>
              <select
                aria-label="Sort order"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
              <select
                aria-label="Export format"
                disabled={busy}
                value=""
                onChange={(e) => download(e.target.value)}
              >
                <option value="">Export…</option>
                <option value="csv">CSV</option>
                <option value="xlsx">Excel</option>
                <option value="pdf">PDF</option>
              </select>
            </>
          )}
        </div>
        {showFilters && (
          <Filters
            value={filters}
            onChange={(v) => {
              setFilters(v);
              setPage(1);
            }}
            categories={categories}
            accounts={accounts}
          />
        )}
        {error && (
          <p role="alert" className="error">
            {error}{" "}
            <button onClick={() => setVersion((v) => v + 1)}>Retry</button>
          </p>
        )}
        {!loading && !listed.length ? (
          <Empty />
        ) : isTx ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Account / payment</th>
                  <th className="right">Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {listed.map((t) => (
                  <tr key={t._id}>
                    <td>
                      <div className="transaction-label">
                        <MoneyType type={t.type} />
                        <div>
                          <strong>{t.description}</strong>
                          <small>
                            {t.merchant || t.source || t.type.toLowerCase()}
                            {t.attachmentId && (
                              <a
                                aria-label="View receipt"
                                target="_blank"
                                rel="noreferrer"
                                href={"/api/attachments/" + t.attachmentId}
                              >
                                <Paperclip size={13} />
                              </a>
                            )}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>{formatDate(t.date)}</td>
                    <td>
                      <span className="badge">
                        {categories.find((c) => c._id === t.categoryId)?.name ??
                          "Archived"}
                      </span>
                    </td>
                    <td>
                      {accounts.find((a) => a._id === t.accountId)?.name ??
                        "Archived"}
                      <small>{t.paymentMethod}</small>
                    </td>
                    <td
                      className={
                        "right amount " +
                        (t.type === "INCOME" ? "positive" : "")
                      }
                    >
                      {t.type === "INCOME" ? "+" : "−"}
                      {money(t.amount)}
                    </td>
                    <td>{actions(t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="record-grid">
            {listed.map((r) => (
              <article
                className={
                  "record-card " + (kind === "accounts" ? "account-card" : "")
                }
                key={r._id}
              >
                <div className="spread">
                  <span className="badge">
                    {kind === "categories"
                      ? r.type
                      : kind === "accounts"
                        ? r.type
                        : kind === "recurring"
                          ? r.frequency
                          : kind === "savings"
                            ? r.status
                            : r.period}
                  </span>
                  {actions(r)}
                </div>
                <h3>{r.name}</h3>
                {kind === "accounts" && (
                  <>
                    <strong className="card-amount">{money(r.balance)}</strong>
                    <small>Opening balance {money(r.openingBalance)}</small>
                  </>
                )}
                {kind === "budgets" && (
                  <>
                    <div className="spread">
                      <strong>{money(r.spent)}</strong>
                      <span className="muted">of {money(r.amount)}</span>
                    </div>
                    <Progress value={r.percent} />
                    <p>
                      {r.percent}% used · {money(r.remaining)} remaining
                    </p>
                    <small>
                      {formatDate(r.startDate)} – {formatDate(r.endDate)}
                    </small>
                  </>
                )}
                {kind === "savings" && (
                  <>
                    <div className="spread">
                      <strong>{money(r.currentAmount)}</strong>
                      <span>of {money(r.targetAmount)}</span>
                    </div>
                    <Progress
                      value={(r.currentAmount / r.targetAmount) * 100}
                    />
                    <small>Target: {formatDate(r.targetDate)}</small>
                  </>
                )}
                {kind === "recurring" && (
                  <>
                    <strong className="card-amount">{money(r.amount)}</strong>
                    <p>Next: {formatDate(r.nextDate)}</p>
                    {r.lastError && <p className="error">{r.lastError}</p>}
                  </>
                )}
                {r.description && <p className="muted">{r.description}</p>}
                {r.active === false && <span className="badge">Inactive</span>}
              </article>
            ))}
          </div>
        )}
        {isTx && (
          <div className="pagination">
            <span>
              Showing {pagination.totalRecords ? (page - 1) * 10 + 1 : 0} to{" "}
              {Math.min(page * 10, pagination.totalRecords ?? 0)} of{" "}
              {pagination.totalRecords ?? 0} entries
            </span>
            <div>
              <button
                aria-label="First page"
                disabled={page === 1}
                onClick={() => setPage(1)}
              >
                «
              </button>
              <button
                aria-label="Previous page"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ‹
              </button>
              {Array.from(
                { length: Math.min(5, pagination.totalPages ?? 0) },
                (_, i) =>
                  Math.max(
                    1,
                    Math.min(page - 2, (pagination.totalPages ?? 1) - 4),
                  ) + i,
              ).map((n) => (
                <button
                  key={n}
                  className={page === n ? "selected" : ""}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                aria-label="Next page"
                disabled={page >= (pagination.totalPages || 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                ›
              </button>
              <button
                aria-label="Last page"
                disabled={page >= (pagination.totalPages || 1)}
                onClick={() => setPage(pagination.totalPages)}
              >
                »
              </button>
            </div>
          </div>
        )}
      </section>
      {editing !== undefined && (
        <Editor
          kind={kind}
          record={editing}
          categories={categories}
          accounts={accounts}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            setVersion((v) => v + 1);
          }}
        />
      )}
      {deleting && (
        <Modal title="Delete this record?" onClose={() => setDeleting(null)}>
          <p>
            “{deleting.description || deleting.name}” will be removed. This will
            update any affected balances and reports.
          </p>
          <footer>
            <button onClick={() => setDeleting(null)}>Cancel</button>
            <button className="danger-button" disabled={busy} onClick={remove}>
              {busy ? "Deleting…" : "OK"}
            </button>
          </footer>
        </Modal>
      )}
    </>
  );
}
