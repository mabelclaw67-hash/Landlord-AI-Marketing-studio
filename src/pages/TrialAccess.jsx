import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Footer from "../components/Footer";
import { isApiConnected } from "../utils/api";
import { validateAccessCode } from "../utils/storage";
import {
  canAccessModule,
  clearTrialAccess,
  getTrialAccessHome,
  getTrialModuleLabel,
  readTrialAccess,
  saveTrialAccess,
} from "../utils/trialAccess";

const INVALID_ACCESS_MESSAGE = "Access code not found, expired, or not approved. Please contact Mabel.";

function inferModuleFromPath(path) {
  if (!path) return "";
  if (path.startsWith("/home-sale-studio")) return "sale";
  if (path === "/examples" || path.startsWith("/listings/") || path.startsWith("/apply/")) return "rental";
  return "";
}

export default function TrialAccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const session = readTrialAccess();
  const requestedModule = params.get("module") || "";
  const nextPath = params.get("next") || "";
  const [form, setForm] = useState({ email: session?.email || "", accessCode: session?.accessCode || "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const moduleLabel = useMemo(() => getTrialModuleLabel(requestedModule), [requestedModule]);
  const nextModule = useMemo(() => inferModuleFromPath(nextPath), [nextPath]);

  const goToApprovedHome = (approvedModule) => {
    if (nextPath && canAccessModule({ approvedModule, accessExpiresAt: session?.accessExpiresAt }, requestedModule)) {
      navigate(nextPath, { replace: true });
      return;
    }
    navigate(getTrialAccessHome(approvedModule), { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await validateAccessCode(form.email, form.accessCode);
      if (!result?.valid) {
        setError(result?.message || INVALID_ACCESS_MESSAGE);
        return;
      }
      const stored = saveTrialAccess(result);
      if (requestedModule && !canAccessModule(stored, requestedModule)) {
        navigate(getTrialAccessHome(stored.approvedModule), { replace: true });
        return;
      }
      if (nextModule && !canAccessModule(stored, nextModule)) {
        navigate(getTrialAccessHome(stored.approvedModule), { replace: true });
        return;
      }
      navigate(nextPath || getTrialAccessHome(stored.approvedModule), { replace: true });
    } catch (err) {
      setError(err.message || INVALID_ACCESS_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pub-page">
      <section className="pub-hero">
        <h1 className="pub-hero__title">Trial Access / 试用入口</h1>
        <p className="pub-hero__sub">Enter your email and access code to open your approved module.</p>
        <p className="pub-hero__desc">
          当前入口对应：{moduleLabel}
        </p>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 720 }}>
          <div className="card">
            {!isApiConnected() ? (
              <div className="notice notice--warm">
                <h4>Local Setup Required / 需要本地连接</h4>
                <p>Set <code>VITE_STUDIO_EXEC_URL</code> before validating trial access.</p>
              </div>
            ) : (
              <>
                {session ? (
                  <div className="notice notice--sage" style={{ marginBottom: 20 }}>
                    <p>
                      Current access: <strong>{session.email}</strong> · <strong>{session.approvedModule}</strong>
                    </p>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => goToApprovedHome(session.approvedModule)}>
                        Open Approved Module / 打开已授权模块
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => {
                          clearTrialAccess();
                          setForm({ email: "", accessCode: "" });
                        }}
                      >
                        Clear Access / 清除访问
                      </button>
                    </div>
                  </div>
                ) : null}

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Email / 邮箱</label>
                    <input
                      className="form-control"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="you@email.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Access Code / 访问码</label>
                    <input
                      className="form-control"
                      required
                      value={form.accessCode}
                      onChange={(e) => setForm((prev) => ({ ...prev, accessCode: e.target.value }))}
                      placeholder="VAI-2026-0001"
                    />
                  </div>

                  {error ? (
                    <div className="notice notice--error" style={{ marginBottom: 14 }}>
                      <p>{error}</p>
                    </div>
                  ) : null}

                  <button type="submit" className="btn btn--sage" disabled={submitting}>
                    {submitting ? "Checking..." : "Open Trial Access / 进入试用"}
                  </button>
                </form>
              </>
            )}

            <div style={{ marginTop: 18, fontSize: "0.82rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>
              <p>
                If you do not have an access code yet, please submit your request on the{" "}
                <Link to="/contact">Contact / Beta</Link> page.
              </p>
              <p style={{ marginTop: 6 }}>
                如果还没有 access code，请先到 <Link to="/contact">Contact / Beta</Link> 页面提交申请。
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
