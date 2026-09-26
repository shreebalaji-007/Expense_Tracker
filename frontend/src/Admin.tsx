import { useEffect, useState } from "react";
import { api, save } from "./api";
import { useApp } from "./context";
import { Field } from "./ui";
export default function Admin() {
  const { toast } = useApp();
  const [users, setUsers] = useState<any[]>([]),
    [audit, setAudit] = useState<any[]>([]),
    [stats, setStats] = useState<any>({}),
    [config, setConfig] = useState<any>(null),
    [categoryText, setCategoryText] = useState(""),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    Promise.all([
      api("admin/users"),
      api("admin/audit"),
      api("admin/stats"),
      api("admin/config"),
    ])
      .then(([u, a, s, c]) => {
        setUsers(u);
        setAudit(a);
        setStats(s);
        setConfig(c);
        setCategoryText(
          c.categories.map((x: any) => `${x.type}: ${x.name}`).join("\n"),
        );
        setError("");
      })
      .catch((e) => setError(e.message));
  }, [version]);
  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await save(
        "admin/config",
        {
          registrationEnabled: config.registrationEnabled,
          categories: categoryText
            .split("\n")
            .filter(Boolean)
            .map((line) => {
              const i = line.indexOf(":");
              return {
                type: line.slice(0, i).trim(),
                name: line.slice(i + 1).trim(),
              };
            }),
        },
        "PUT",
      );
      toast("Configuration saved");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>
          <h1>System overview</h1>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="stats-grid">
        {Object.entries(stats).map(([k, v]) => (
          <div className="stat" key={k}>
            <span>{k.replace(/([A-Z])/g, " $1")}</span>
            <strong>{String(v)}</strong>
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Registered users</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.first_name} {u.last_name}
                  </td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.status}</td>
                  <td>
                    <button
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await save(
                            "admin/users/" + u.id,
                            {
                              status:
                                u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                            },
                            "PUT",
                          );
                          setVersion((v) => v + 1);
                        } catch (e) {
                          setError((e as Error).message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {u.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {config && (
        <section className="panel pad">
          <h2>Application configuration</h2>
          <form onSubmit={saveConfig}>
            <label className="check">
              <input
                type="checkbox"
                checked={config.registrationEnabled}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    registrationEnabled: e.target.checked,
                  })
                }
              />
              Allow registration
            </label>
            <Field label="Default categories for new users (TYPE: Name, one per line)">
              <textarea
                rows={12}
                value={categoryText}
                onChange={(e) => setCategoryText(e.target.value)}
              />
            </Field>
            <footer>
              <button className="primary" disabled={busy}>
                Save configuration
              </button>
            </footer>
          </form>
        </section>
      )}
      <section className="panel">
        <div className="panel-heading">
          <h2>Authentication audit</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Email</th>
                <th>Status</th>
                <th>Device</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a, i) => (
                <tr key={i}>
                  <td>{new Date(a.login_time).toLocaleString()}</td>
                  <td>{a.email}</td>
                  <td>{a.login_status}</td>
                  <td className="device-cell">{a.device}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
