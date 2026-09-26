import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  ArrowUpRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { api } from "./api";
import { useApp } from "./context";
import { Empty, Progress, MoneyType } from "./ui";
import Filters, { range, qs } from "./Filters";
import Editor from "./Editor";
const colors = [
  "#087f79",
  "#3b82f6",
  "#f7b84b",
  "#9c72db",
  "#e77866",
  "#1c5260",
];
export default function Dashboard() {
  const { user, money, formatDate } = useApp();
  const [filters, setFilters] = useState<any>(range("month"));
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [editing, setEditing] = useState(false),
    [cats, setCats] = useState<any[]>([]),
    [accounts, setAccounts] = useState<any[]>([]),
    [insight, setInsight] = useState(""),
    [insightError, setInsightError] = useState(""),
    [insightLoading, setInsightLoading] = useState(false),
    [version, setVersion] = useState(0);
  const getInsight = async () => {
    setInsightLoading(true);
    setInsightError("");
    try {
      const result = await api<{ insight: string }>("ai/insights?" + qs(filters));
      setInsight(result.insight);
    } catch (e) {
      setInsightError((e as Error).message);
    } finally {
      setInsightLoading(false);
    }
  };
  useEffect(() => {
    let live = true;
    Promise.all([
      api("dashboard/summary?" + qs(filters)),
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
  }, [filters, version]);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR FINANCIAL SNAPSHOT</span>
          <h1>A clearer day, {user.firstName}.</h1>
          <p className="muted">
            Small steps today. More possibilities tomorrow.
          </p>
        </div>
        <button className="primary" onClick={() => setEditing(true)}>
          <Plus size={18} />
          Add expense
        </button>
      </div>
      <Filters
        value={filters}
        onChange={setFilters}
        categories={[]}
        accounts={[]}
        advanced={false}
      />
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!data ? (
        <p>Loading your overview…</p>
      ) : (
        <>
          <div className="stats-grid">
            {[
              {
                label: "Total balance",
                value: data.balance,
                icon: Wallet,
                cls: "balance",
                sub: "Across all accounts · all time",
              },
              {
                label: "Income",
                value: data.income,
                icon: TrendingUp,
                cls: "",
                sub: "In selected period",
              },
              {
                label: "Expenses",
                value: data.expense,
                icon: TrendingDown,
                cls: "",
                sub: "In selected period",
              },
              {
                label: "Net savings",
                value: data.savings,
                icon: PiggyBank,
                cls: "",
                sub: "Income less expenses",
              },
            ].map((s) => (
              <article key={s.label} className={"stat " + s.cls}>
                <div className="spread">
                  <span>{s.label}</span>
                  <s.icon size={20} />
                </div>
                <strong>{money(s.value)}</strong>
                <small>{s.sub}</small>
              </article>
            ))}
          </div>
          <div className="quick-stats">
            <span>
              Today’s expenses <strong>{money(data.todayExpense)}</strong>
            </span>
            <span>
              This month <strong>{money(data.monthExpense)}</strong>
            </span>
            <span>
              Remaining active budgets{" "}
              <strong>{money(data.remainingBudget)}</strong>
            </span>
          </div>
          <section className="panel ai-insight">
            <div className="panel-heading">
              <div>
                <h2><Sparkles size={19} /> AI spending insight</h2>
                <small>Uses your selected-period totals and budgets—not transaction details.</small>
              </div>
              <button className="primary" onClick={getInsight} disabled={insightLoading}>
                <Sparkles size={17} />
                {insightLoading ? "Thinking…" : insight ? "Refresh insight" : "Get insight"}
              </button>
            </div>
            <div className="ai-insight-content">
              {insight ? <p>{insight}</p> : <p className="muted">Get a concise, privacy-conscious summary of your spending patterns.</p>}
              {insightError && <p className="error" role="alert">{insightError}</p>}
            </div>
          </section>
          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Money in. Money out.</h2>
                  <small>Monthly income and expenses</small>
                </div>
                <span className="badge">Cash flow</span>
              </div>
              {data.monthly.length ? (
                <div className="chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.monthly}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis width={65} />
                      <Tooltip formatter={(v: any) => money(Number(v))} />
                      <Legend />
                      <Bar
                        name="Income"
                        dataKey="income"
                        fill="#087f79"
                        radius={[5, 5, 0, 0]}
                      />
                      <Bar
                        name="Expenses"
                        dataKey="expense"
                        fill="#f4b44d"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Empty text="Your cash flow chart will appear after your first transaction." />
              )}
            </section>
            <section className="panel">
              <div className="panel-heading">
                <h2>Where it goes</h2>
                <Link to="/reports">
                  <ArrowUpRight size={18} />
                </Link>
              </div>
              {data.categories.length ? (
                <>
                  <div className="chart donut">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.categories}
                          dataKey="expense"
                          nameKey="name"
                          innerRadius="60%"
                          outerRadius="88%"
                          paddingAngle={4}
                        >
                          {data.categories.map((_: any, i: number) => (
                            <Cell key={i} fill={colors[i % colors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => money(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="legend-list">
                    {data.categories.map((c: any, i: number) => (
                      <div key={c.name}>
                        <span>
                          <i
                            style={{ background: colors[i % colors.length] }}
                          />
                          {c.name}
                        </span>
                        <strong>{money(c.expense)}</strong>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <Empty text="Record an expense to see your spending breakdown." />
              )}
            </section>
          </div>
          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-heading">
                <h2>Recent activity</h2>
                <Link to="/transactions">
                  View all <ArrowUpRight size={16} />
                </Link>
              </div>
              {data.recent.length ? (
                <div className="activity">
                  {data.recent.map((t: any) => (
                    <div key={t._id}>
                      <MoneyType type={t.type} />
                      <span>
                        <strong>{t.description}</strong>
                        <small>
                          {t.category} · {formatDate(t.date)}
                        </small>
                      </span>
                      <strong className={t.type === "INCOME" ? "positive" : ""}>
                        {t.type === "INCOME" ? "+" : "−"}
                        {money(t.amount)}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty text="Your first entry starts the story. Add income or an expense." />
              )}
            </section>
            <section className="panel">
              <div className="panel-heading">
                <h2>Stay on track</h2>
                <Link to="/budgets">
                  Budgets <ArrowUpRight size={16} />
                </Link>
              </div>
              {data.budgets.length ? (
                <div className="budget-list">
                  {data.budgets.map((b: any) => (
                    <div key={b._id}>
                      <div className="spread">
                        <strong>{b.name}</strong>
                        <span>{b.percent}%</span>
                      </div>
                      <Progress value={b.percent} />
                      <small>
                        {money(b.spent)} of {money(b.amount)}
                      </small>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty text="Set a budget to give your spending a little direction." />
              )}
            </section>
          </div>
          <section className="panel">
            <div className="panel-heading">
              <h2>Daily spending trend</h2>
            </div>
            {data.trend.length ? (
              <div className="chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis width={65} />
                    <Tooltip formatter={(v: any) => money(Number(v))} />
                    <Line
                      name="Expenses"
                      type="monotone"
                      dataKey="expense"
                      stroke="#087f79"
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty />
            )}
          </section>
        </>
      )}
      {editing && (
        <Editor
          kind="expenses"
          categories={cats}
          accounts={accounts}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            setVersion((v) => v + 1);
          }}
        />
      )}
    </>
  );
}
