import { useEffect, useState } from "react";
import { api, save } from "./api";
import { useApp } from "./context";
import { Field } from "./ui";
export default function Settings() {
  const { user, prefs, setPrefs, setUser, toast } = useApp();
  const [v, setV] = useState<any>({ ...user, ...prefs }),
    [history, setHistory] = useState<any[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const change = (k: string, value: any) =>
    setV((old: any) => ({ ...old, [k]: value }));
  useEffect(() => {
    api("settings/login-history")
      .then(setHistory)
      .catch((e) => setError(e.message));
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await save("settings", v, "PUT");
      setPrefs(v);
      setUser({
        ...user,
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        phone: v.phone,
      });
      toast("Settings saved");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function security(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await save(
        "auth/change-password",
        Object.fromEntries(new FormData(e.currentTarget)),
      );
      setUser(null);
      toast("Password changed. Please sign in again.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const input = (k: string, label: string, type = "text") => (
    <Field label={label}>
      <input
        value={v[k] ?? ""}
        type={type}
        required={["firstName", "lastName", "email", "timezone"].includes(k)}
        onChange={(e) => change(k, e.target.value)}
      />
    </Field>
  );
  const select = (k: string, label: string, values: string[]) => (
    <Field label={label}>
      <select value={v[k]} onChange={(e) => change(k, e.target.value)}>
        {values.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </Field>
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MAKE IT YOURS</span>
          <h1>Settings</h1>
        </div>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <form onSubmit={submit}>
        <section className="panel pad">
          <h2>Profile & preferences</h2>
          <div className="profile-photo">
            {v.photoId && (
              <img alt="Profile" src={"/api/attachments/" + v.photoId} />
            )}
            <Field label="Profile photo">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setBusy(true);
                  try {
                    const fd = new FormData();
                    fd.append("file", f);
                    const r = await api("attachments", {
                      method: "POST",
                      body: fd,
                    });
                    change("photoId", r._id);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </Field>
            {v.photoId && (
              <button type="button" onClick={() => change("photoId", null)}>
                Remove photo
              </button>
            )}
          </div>
          <div className="form-grid three">
            {input("firstName", "First name")}
            {input("lastName", "Last name")}
            {input("email", "Email", "email")}
            {input("phone", "Phone")}
            {input("country", "Country")}
            {input("timezone", "Timezone (e.g. Asia/Kolkata)")}
            {select("currency", "Currency", [
              "INR",
              "USD",
              "EUR",
              "GBP",
              "JPY",
            ])}
            {select("dateFormat", "Date format", [
              "DD/MM/YYYY",
              "MM/DD/YYYY",
              "YYYY-MM-DD",
            ])}
            {select("theme", "Appearance", ["light", "dark", "system"])}
            {select("language", "Language", ["en"])}
            {v.email !== user.email &&
              input(
                "currentPassword",
                "Current password (to change email)",
                "password",
              )}
          </div>
          <h3>Notifications</h3>
          <div className="checks">
            {[
              ["emailNotifications", "Email notifications"],
              ["budgetAlerts", "Budget alerts"],
              ["recurringReminders", "Recurring reminders"],
              ["monthlyReports", "Monthly report notification"],
            ].map(([k, l]) => (
              <label className="check" key={k}>
                <input
                  type="checkbox"
                  checked={!!v[k]}
                  onChange={(e) => change(k, e.target.checked)}
                />
                {l}
              </label>
            ))}
          </div>
          <footer>
            <button className="primary" disabled={busy}>
              Save settings
            </button>
          </footer>
        </section>
      </form>
      <section className="panel pad">
        <h2>Security</h2>
        <form onSubmit={security}>
          <div className="form-grid three">
            <Field label="Current password">
              <input
                type="password"
                name="currentPassword"
                required
                autoComplete="current-password"
              />
            </Field>
            <Field label="New password">
              <input
                type="password"
                name="password"
                minLength={8}
                maxLength={72}
                required
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm password">
              <input
                type="password"
                name="confirmPassword"
                required
                autoComplete="new-password"
              />
            </Field>
          </div>
          <footer>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                try {
                  await save("auth/logout-all", {});
                  setUser(null);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Sign out all devices
            </button>
            <button className="primary" disabled={busy}>
              Change password
            </button>
          </footer>
        </form>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>Login history</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Device</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i}>
                  <td>{new Date(h.login_time).toLocaleString()}</td>
                  <td className="device-cell">{h.device}</td>
                  <td>{h.login_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
