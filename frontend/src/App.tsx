import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  NavLink,
  useLocation,
} from "react-router-dom";
import {
  Wallet,
  LayoutDashboard,
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  Tags,
  Target,
  Repeat2,
  PiggyBank,
  ChartNoAxesCombined,
  Settings as SettingsIcon,
  Bell,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { Context, type User } from "./context";
import { api, save } from "./api";
import Auth from "./Auth";
import Dashboard from "./Dashboard";
import Records from "./Records";
import Reports from "./Reports";
import Settings from "./Settings";
import Admin from "./Admin";
import { Empty } from "./ui";
const defaultPrefs = {
  currency: "INR",
  timezone: "Asia/Kolkata",
  theme: "system",
  dateFormat: "DD/MM/YYYY",
  country: "India",
  language: "en",
  emailNotifications: false,
  budgetAlerts: true,
  recurringReminders: true,
  monthlyReports: true,
};
const links = [
  ["/", "Overview", LayoutDashboard],
  ["/transactions", "Transactions", ArrowLeftRight],
  ["/expenses", "Expenses", ArrowUpRight],
  ["/income", "Income", ArrowDownLeft],
  ["/accounts", "Accounts", Wallet],
  ["/categories", "Categories", Tags],
  ["/budgets", "Budgets", Target],
  ["/recurring", "Recurring", Repeat2],
  ["/savings", "Savings goals", PiggyBank],
  ["/reports", "Reports", ChartNoAxesCombined],
] as const;
function Notifications() {
  const [items, setItems] = useState<any[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    api("notifications")
      .then(setItems)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <div className="page-heading">
        <h1>Notifications</h1>
        <button
          onClick={async () => {
            try {
              await save("notifications/read-all", {}, "PUT");
              setItems(items.map((n) => ({ ...n, read: true })));
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Mark all as read
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <section className="panel pad">
        {items.length ? (
          items.map((n) => (
            <article
              key={n._id}
              className={"notification " + (n.read ? "" : "unread")}
            >
              <span className="badge">{n.type}</span>
              <p>{n.message}</p>
              <small>{new Date(n.createdAt).toLocaleString()}</small>
              {!n.read && (
                <button
                  onClick={async () => {
                    try {
                      await save("notifications/" + n._id, {}, "PUT");
                      setItems(
                        items.map((x) =>
                          x._id === n._id ? { ...x, read: true } : x,
                        ),
                      );
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Mark read
                </button>
              )}
            </article>
          ))
        ) : (
          <Empty text="You’re all caught up." />
        )}
      </section>
    </>
  );
}
export default function App() {
  const [user, setUser] = useState<User | null>(null),
    [prefs, setPrefs] = useState<any>(defaultPrefs),
    [ready, setReady] = useState(false),
    [booted, setBooted] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [menu, setMenu] = useState(false);
  const location = useLocation();
  useEffect(() => {
    api("auth/me")
      .then(setUser)
      .catch(async () => {
        try {
          await save("auth/refresh", {});
          setUser(await api("auth/me"));
        } catch {}
      })
      .finally(() => setReady(true));
    const expired = () => setUser(null);
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, []);
  useEffect(() => {
    setBooted(false);
    if (user)
      save("bootstrap", {})
        .then((d) => {
          setPrefs({ ...defaultPrefs, ...d.preferences });
          setBooted(true);
          setError("");
        })
        .catch((e) => setError(e.message));
  }, [user?.id]);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const theme = () =>
      (document.documentElement.dataset.theme =
        prefs.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : prefs.theme);
    theme();
    media.addEventListener("change", theme);
    return () => media.removeEventListener("change", theme);
  }, [prefs.theme]);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 5000);
      return () => clearTimeout(t);
    }
  }, [notice]);
  useEffect(() => setMenu(false), [location.pathname]);
  const context = {
    user,
    prefs,
    setPrefs,
    setUser,
    toast: setNotice,
    money: (n: number) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: prefs.currency,
        maximumFractionDigits: 2,
      }).format(n ?? 0),
    formatDate: (v: string) => {
      if (!v) return "";
      const [y, m, d] = v.slice(0, 10).split("-");
      return prefs.dateFormat === "DD/MM/YYYY"
        ? `${d}/${m}/${y}`
        : prefs.dateFormat === "MM/DD/YYYY"
          ? `${m}/${d}/${y}`
          : v.slice(0, 10);
    },
  };
  return (
    <Context.Provider value={context}>
      {!ready ? (
        <div className="startup">Opening Daybook…</div>
      ) : !user ? (
        <Routes>
          {["login", "register", "forgot-password", "reset-password"].map(
            (mode) => (
              <Route
                path={"/" + mode}
                key={mode}
                element={<Auth key={mode} mode={mode} />}
              />
            ),
          )}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <div className="app-shell">
          {menu && (
            <button
              className="menu-overlay"
              aria-label="Close navigation"
              onClick={() => setMenu(false)}
            />
          )}
          <aside className={"sidebar " + (menu ? "open" : "")}>
            <NavLink to="/" className="brand">
              <Wallet />
              daybook<span>PERSONAL FINANCE</span>
            </NavLink>
            <small className="nav-heading">WORKSPACE</small>
            <nav>
              {links.map(([path, label, Icon]) => (
                <NavLink end={path === "/"} to={path} key={path}>
                  <Icon size={19} />
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="nav-bottom">
              <NavLink to="/settings">
                <SettingsIcon size={19} />
                Settings
              </NavLink>
              {user.role === "ADMIN" && (
                <NavLink to="/admin">
                  <ShieldCheck size={19} />
                  Administration
                </NavLink>
              )}
              <button
                onClick={async () => {
                  try {
                    await save("auth/logout", {});
                    setUser(null);
                  } catch (e) {
                    setNotice((e as Error).message);
                  }
                }}
              >
                <LogOut size={19} />
                Sign out
              </button>
            </div>
            <div className="sidebar-note">
              <PiggyBank size={26} />
              <strong>Every little bit adds up.</strong>
              <span>Keep your goals in sight.</span>
            </div>
          </aside>
          <div className="workspace">
            <header className="topbar">
              <button
                className="icon-btn mobile-menu"
                aria-label="Open navigation"
                onClick={() => setMenu(true)}
              >
                <Menu />
              </button>
              <span className="topbar-label">Personal workspace</span>
              <div>
                <span className="currency-pill">{prefs.currency}</span>
                <NavLink
                  className="icon-btn"
                  to="/notifications"
                  aria-label="Notifications"
                >
                  <Bell size={20} />
                </NavLink>
                <NavLink to="/settings" className="user-badge">
                  <span className="avatar">
                    {prefs.photoId ? (
                      <img alt="" src={"/api/attachments/" + prefs.photoId} />
                    ) : (
                      user.firstName[0] + user.lastName[0]
                    )}
                  </span>
                  <span>
                    {user.firstName}
                    <small>Personal account</small>
                  </span>
                </NavLink>
              </div>
            </header>
            <main className="content">
              {!booted ? (
                <p className={error ? "error" : ""}>
                  {error || "Preparing your workspace…"}
                  {error && (
                    <button onClick={() => window.location.reload()}>
                      Retry
                    </button>
                  )}
                </p>
              ) : (
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  {[
                    "transactions",
                    "expenses",
                    "income",
                    "accounts",
                    "categories",
                    "budgets",
                    "recurring",
                    "savings",
                  ].map((k) => (
                    <Route
                      key={k}
                      path={"/" + k}
                      element={<Records key={k} kind={k} />}
                    />
                  ))}
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route
                    path="/admin"
                    element={
                      user.role === "ADMIN" ? (
                        <Admin />
                      ) : (
                        <Navigate to="/" replace />
                      )
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              )}
            </main>
            <div className="app-footer">
              Daybook <span>A little more clarity, every day.</span>
            </div>
          </div>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
